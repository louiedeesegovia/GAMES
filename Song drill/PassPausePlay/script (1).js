/* ============================================================
   script.js — all behavior for the Music app + the
   1-Minute Song Rush team quiz game.

   BIG CHANGES IN THIS VERSION:
   - Each Round 1 / Round 2 playlist card now carries its OWN 12
     songs (title/artist/duration/lyrics/src). Clicking a card opens
     Song Rush using THAT playlist's songs — Round 1 cards are worth
     1 point per correct song, Round 2 cards are worth 2 points.
   - A Group 1 / Group 2 scoreboard tracks points across rounds.
   - The old shared "Your Library" list/search is gone (removed along
     with its section in index.html), so any code that referenced it
     has been removed too — that mismatch (JS reaching for elements
     that no longer exist) is what broke the play button before.
   ============================================================ */
(function(){

  // ---------- Data: album-art gradients ----------
  // Cards/rounds never use real images — just one of these CSS
  // gradients, picked by index. Keeps the app dependency-free.
  const gradients = [
    "linear-gradient(135deg,#fb2d51,#fd6f3e)",
    "linear-gradient(135deg,#7b2ff7,#f107a3)",
    "linear-gradient(135deg,#00c6ff,#0072ff)",
    "linear-gradient(135deg,#f9d423,#ff4e50)",
    "linear-gradient(135deg,#11998e,#38ef7d)",
    "linear-gradient(135deg,#654ea3,#eaafc8)",
    "linear-gradient(135deg,#ee0979,#ff6a00)",
    "linear-gradient(135deg,#2b5876,#4e4376)",
    "linear-gradient(135deg,#f857a6,#ff5858)",
    "linear-gradient(135deg,#2193b0,#6dd5ed)"
  ];
  // Picks a gradient for a given numeric seed (wraps around with modulo)
  function art(seed){ return gradients[seed % gradients.length]; }

  // Escapes HTML special characters so a song title can't break markup
  // when injected via innerHTML (used by the in-game guess dropdown).
  function escapeHtml(str){
    return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  // Wraps the matching substring of `title` in <mark> so the query text
  // is visually highlighted inside a suggestion row.
  function highlightMatch(title, query){
    const idx = title.toLowerCase().indexOf(query);
    if (idx === -1) return escapeHtml(title);
    const before = escapeHtml(title.slice(0, idx));
    const match = escapeHtml(title.slice(idx, idx + query.length));
    const after = escapeHtml(title.slice(idx + query.length));
    return `${before}<mark>${match}</mark>${after}`;
  }

  // ---------- Optional timestamp syntax for karaoke-synced lyrics ----------
  // A "lyrics" string can tag each word with when it should light up.
  // Two formats both work, mix and match freely in the same line:
  //   - plain seconds:   [0.0]Amazing [0.6]grace
  //   - minutes:seconds: [1:23]Amazing [1:23.5]grace   (for songs past 1 min)
  //   - h:mm:ss also works for anything an hour or longer: [1:02:15]
  // Words WITHOUT any [time] tag just get the plain fixed-pace reveal —
  // this syntax is entirely optional per song.
  //
  // Converts one timestamp token (whatever was inside the brackets) into
  // a plain number of seconds, whichever of the formats above it's in.
  function timeTagToSeconds(raw){
    if (raw.indexOf(":") === -1){
      return parseFloat(raw); // already plain seconds, e.g. "83.5"
    }
    const parts = raw.split(":").map(Number);
    if (parts.length === 2){
      const [min, sec] = parts;           // "1:23"    -> 1 min 23 sec
      return min * 60 + sec;
    }
    if (parts.length === 3){
      const [hr, min, sec] = parts;       // "1:02:15" -> 1 hr 2 min 15 sec
      return hr * 3600 + min * 60 + sec;
    }
    return parseFloat(raw); // malformed — fall back rather than crash
  }

  // Parses the [time]word syntax into [{time, word}, ...] (time always
  // normalized to plain seconds via timeTagToSeconds). Returns null if
  // the string has no [time] tags at all, so callers can fall back cleanly.
  function parseTimedLyrics(text){
    const regex = /\[([\d:.]+)\](\S+)/g;
    const result = [];
    let m;
    while ((m = regex.exec(text)) !== null){
      result.push({ time: timeTagToSeconds(m[1]), word: m[2] });
    }
    return result.length ? result : null;
  }
  // Strips [time] tags back out, leaving plain readable text — used when
  // a lyrics string has timestamps but there's no audio "src" to sync to.
  function stripTimestamps(text){
    return text.replace(/\[[\d:.]+\]/g, "");
  }

  // ---------- Data: Round 1 playlists ("New Releases" cards) ----------
  // Each playlist has its own 12 songs. Round 1 songs are worth 1 point
  // each when guessed correctly in Song Rush.
  //
  // 👉 AUDIO FILES: every song has a "src" field below — that's where you
  //    put YOUR music file for that song. It accepts either:
  //      - a relative path to a file sitting next to these files, e.g.
  //          src: "audio/be-still-1.mp3"
  //      - a full URL to an audio file, e.g.
  //          src: "https://example.com/songs/be-still-1.mp3"
  //    Leave it as "" (empty) to keep that song silent — the round still
  //    works fine with just the lyric-hint text, no audio required.
  //    Supported formats depend on the browser but MP3/OGG/WAV/M4A all
  //    work in every modern browser via the standard <audio> element.
  //
  // 👉 ALBUM PHOTOS: each PLAYLIST (not each song) has an "img" field
  //    right after its "sub" — that's the cover photo for its card and
  //    for the lyric box background while that playlist's round is being
  //    played. Same rules as "src": a relative path (e.g. "images/be-still.jpg")
  //    or a full URL. Leave it as "" to keep the current colored-gradient
  //    look for that card instead of a photo.
  //
  // 👉 TIMED LYRICS (karaoke synced to the actual song): tag any word in
  //    "lyrics" with a timestamp right before it to make it light up at
  //    that exact point in playback. Two formats both work:
  //      - plain seconds:   "[0.0]Amazing [0.6]grace"
  //      - minutes:seconds: "[1:23]Amazing [1:23.5]grace"   (for anywhere
  //        past the 1-minute mark — no need to convert to raw seconds)
  //      - h:mm:ss also works for anything an hour+ long: "[1:02:15]word"
  //    Full example for a song where the hint line starts around 1m23s:
  //      lyrics: "[1:23]Amazing [1:23.6]grace, [1:24.4]how [1:24.8]sweet [1:25.2]the [1:25.5]sound"
  //    This ONLY works for a song that also has a "src" set — the reveal
  //    is driven by that audio's real playback position, not a timer, so
  //    it stays in sync even through Pause/resume. Figure out each word's
  //    timestamp by ear (or with any audio editor / lyrics-timing tool)
  //    and drop it in. If you skip the [time] tags, that song just gets
  //    the plain fixed-pace word reveal instead — nothing breaks either way.
  const albums = [

  {
    title: "Be Still", 
    sub: "Aperture Drift", img: "",
    songs: [
      { title: "Be Still Song 1", artist: "Aperture Drift", duration: "3:15", lyrics: "Lyric line 1...", src: "" },
      { title: "Be Still Song 2", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 2...", src: "" },
      { title: "Be Still Song 3", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 3...", src: "" },
      { title: "Be Still Song 4", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 4...", src: "" },
      { title: "Be Still Song 5", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 5...", src: "" },
      { title: "Be Still Song 6", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 6...", src: "" },
      { title: "Be Still Song 7", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 7...", src: "" },
      { title: "Be Still Song 8", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 8...", src: "" },
      { title: "Be Still Song 9", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 9...", src: "" },
      { title: "Be Still Song 10", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 10...", src: "" },
      { title: "Be Still Song 11", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 11...", src: "" },
      { title: "Be Still Song 12", artist: "Aperture Drift", duration: "2:50", lyrics: "Lyric line 12...", src: "" }
    ]
  },
  {
    title: "Follow Me", 
    sub: "Halide Youth", img: "",
    songs: [
      { title: "Follow Me Song 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 1...", src: "" },
      { title: "Follow Me Song 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 2...", src: "" },
      { title: "Follow Me Song 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 3...", src: "" },
      { title: "Follow Me Song 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 4...", src: "" },
      { title: "Follow Me Song 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 5...", src: "" },
      { title: "Follow Me Song 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 6...", src: "" },
      { title: "Follow Me Song 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 7...", src: "" },
      { title: "Follow Me Song 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 8...", src: "" },
      { title: "Follow Me Song 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 9...", src: "" },
      { title: "Follow Me Song 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 10...", src: "" },
      { title: "Follow Me Song 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 11...", src: "" },
      { title: "Follow Me Song 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyric line 12...", src: "" }
    ]
  },
  {
    title: "Walk by Faith",
    sub: "Compile Error", img: "",
    songs:[
      { title: "Walk by Faith 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Walk by Faith 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
    ]

  },
  {
    title: "Praise the Lord",
    sub: "Aisle Six", img: "",
    songs:[
      { title: "Praise the Lord 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Praise the Lord 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" }
    ]

  },
  {
    title: "Fear Not",
    sub: "Loft Sessions", img: "",
    songs:[
      { title: "Fear Not 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Fear Not 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" }
    ]

  },
  {
    title: "Still Waters",
    sub: "Kilobyte Choir", img: "",
    songs:[
      { title: "Still Waters 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
      { title: "Still Waters 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
    ]

  }
  ];

  // ---------- Data: Round 2 playlists ("Made For You" cards) ----------
  // Same shape as Round 1, but each correct song here is worth 2 points
  // (see openGame() calls below). Now has 6 playlists total.
  const mixes = [

    {title:"Salt of the Earth", sub:"Playlist · Focus", img: "",
      songs:[
        {title: "Salt of the Earth 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Salt of the Earth 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" }
      ]
    },
    {title:"Bread of Life", sub:"Playlist · Focus", img: "",
      songs:[
        {title: "Bread of Life 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Bread of Life 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" }
      ]
    },
    {title:"Take My Life", sub:"Playlist · Warm", img: "",
      songs:[
        {title: "Take My Life 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Take My Life 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" }
      ]
    },
    {title:"Nearer", sub:"Playlist · Upbeat", img: "",
      songs:[
        {title: "Nearer 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Nearer 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" }
      ]
    },
    {title:"Pass Me Not", sub:"Playlist · Instrumental", img: "",
      songs:[
        {title: "Pass Me Not 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Pass Me Not 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" }
      ]
    },
    {title:"Give Me Jesus", sub:"Playlist · Acoustic", img: "",
      songs:[
        {title: "Give Me Jesus 1", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 2", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 3", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 4", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 5", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 6", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 7", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 8", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 9", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 10", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 11", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" },
        {title: "Give Me Jesus 12", artist: "Halide Youth", duration: "3:20", lyrics: "Lyrics line...", src: "" }
      ]
    },
  ];

  // ---------- Render cards (Round 1 / Round 2) ----------
  // Builds the HTML for one horizontal row of cards from a list of
  // {title, sub, img} playlist items and injects it into the container.
  // If a playlist has an "img" set, that photo is used as the card's
  // cover art; otherwise it falls back to the CSS gradient look.
  function renderRow(container, items){
    container.innerHTML = items.map((it, i) => {
      const bg = it.img
        ? `background-image:url('${it.img}'); background-size:cover; background-position:center;`
        : `background:${art(i + container.id.length)};`;
      return `
      <div class="card" data-title="${it.title}" data-sub="${it.sub}">
        <div class="art" style="${bg}">
          <div class="playbtn">
            <!-- Clicking this play icon (or anywhere on the card) opens
                 1-Minute Song Rush using this playlist's 12 songs —
                 see the click listeners registered right below. -->
            <svg class="pb-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <div class="glyph">${it.title.slice(0,2).toUpperCase()}</div>
        </div>
        <div class="title">${it.title}</div>
        <div class="sub">${it.sub}</div>
      </div>
    `;
    }).join("");
  }
  // Render both rows on page load
  renderRow(document.getElementById("newReleases"), albums);
  renderRow(document.getElementById("madeForYou"), mixes);

  // Round 1 cards: open Song Rush with THIS album's 12 songs, worth
  // 1 point each, and pass along its cover photo (if any) so the game
  // modal's lyric box can show it too.
  document.querySelectorAll("#newReleases .card").forEach((card, i) => {
    card.addEventListener("click", () => {
      openGame(albums[i].songs, 1, albums[i].title, albums[i].img);
    });
  });
  // Round 2 cards: open Song Rush with THIS mix's 12 songs, worth
  // 2 points each, same cover-photo passthrough.
  document.querySelectorAll("#madeForYou .card").forEach((card, i) => {
    card.addEventListener("click", () => {
      openGame(mixes[i].songs, 2, mixes[i].title, mixes[i].img);
    });
  });

  // ---------- Now-playing bar ----------
  // A generic "browse everything" player over every song across every
  // playlist (Round 1 + Round 2 combined). Not tied to the game — this
  // is just a way to preview songs directly from the bottom bar using
  // prev/next, independent of which round/group is currently playing.
  const allSongs = [].concat(
    ...albums.map(a => a.songs),
    ...mixes.map(m => m.songs)
  );

  let currentIdx = 0;       // index into `allSongs` of the loaded track
  let isPlaying = false;
  let elapsed = 0;          // seconds into the current track (real or simulated)
  let duration = 195;       // seconds; overwritten by real audio metadata once available
  let timer = null;         // setInterval handle used ONLY for the no-audio simulated fallback

  const npArt = document.getElementById("npArt");
  const npTitle = document.getElementById("npTitle");
  const npArtist = document.getElementById("npArtist");
  const npHeart = document.getElementById("npHeart");
  const playIcon = document.getElementById("playIcon");
  const progressFill = document.getElementById("progressFill");
  const progressKnob = document.getElementById("progressKnob");
  const curTimeEl = document.getElementById("curTime");
  const totalTimeEl = document.getElementById("totalTime");
  const audioPlayer = document.getElementById("audioPlayer"); // real <audio> element for this bar

  // Converts a "m:ss" duration string (e.g. "3:20") into total seconds
  function durToSeconds(str){
    const [m, s] = str.split(":").map(Number);
    return m * 60 + s;
  }
  // Formats a seconds count as "m:ss" for display
  function fmt(sec){
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec/60) + ":" + String(sec%60).padStart(2,"0");
  }

  // Loads a track into the now-playing bar. If the track has a real
  // "src", the <audio> element is pointed at it (real playback,
  // real duration once metadata loads). If not, we fall back to the
  // simulated timer using the track's declared "duration" string.
  function loadTrack(idx){
    currentIdx = idx;
    const tr = allSongs[idx];
    npTitle.textContent = tr.title;
    npArtist.textContent = tr.artist;
    npArt.style.background = art(idx);
    npHeart.classList.remove("liked");

    duration = durToSeconds(tr.duration);
    elapsed = 0;
    totalTimeEl.textContent = tr.duration;
    updateProgress();

    clearInterval(timer);
    timer = null;
    audioPlayer.pause();
    if (tr.src){
      audioPlayer.src = tr.src;
      audioPlayer.currentTime = 0;
    } else {
      audioPlayer.removeAttribute("src");
    }
  }

  // Updates the scrub bar fill/knob position and the elapsed-time label
  function updateProgress(){
    const pct = duration ? (elapsed / duration) * 100 : 0;
    progressFill.style.width = pct + "%";
    progressKnob.style.left = pct + "%";
    curTimeEl.textContent = fmt(elapsed);
  }

  // Starts playback: real <audio> if this track has a src, otherwise a
  // simulated timer that just ticks `elapsed` forward once per second.
  function play(){
    isPlaying = true;
    playIcon.innerHTML = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'; // pause icon
    const tr = allSongs[currentIdx];
    if (tr.src){
      audioPlayer.play().catch(() => {}); // ignore autoplay-block rejections
    } else {
      clearInterval(timer);
      timer = setInterval(() => {
        elapsed += 1;
        if (elapsed >= duration){ nextTrack(); return; }
        updateProgress();
      }, 1000);
    }
  }

  // Stops playback (real audio or the simulated fallback timer)
  function pause(){
    isPlaying = false;
    playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>'; // play icon
    clearInterval(timer);
    audioPlayer.pause();
  }

  // Loads and plays the next track, wrapping around at the end of the list
  function nextTrack(){
    loadTrack((currentIdx + 1) % allSongs.length);
    play();
  }
  // Loads and plays the previous track, wrapping around at the start
  function prevTrack(){
    loadTrack((currentIdx - 1 + allSongs.length) % allSongs.length);
    play();
  }

  // Keep the bar's progress bar in sync with REAL audio as it plays
  audioPlayer.addEventListener("timeupdate", () => {
    if (!allSongs[currentIdx].src) return; // simulated tracks use the setInterval above instead
    elapsed = audioPlayer.currentTime;
    updateProgress();
  });
  // Once real metadata loads, use the file's actual duration
  audioPlayer.addEventListener("loadedmetadata", () => {
    if (!allSongs[currentIdx].src) return;
    duration = audioPlayer.duration || duration;
    totalTimeEl.textContent = fmt(duration);
  });
  // Auto-advance when a real audio file finishes playing
  audioPlayer.addEventListener("ended", nextTrack);

  // Transport control buttons
  document.getElementById("playBtn").addEventListener("click", () => isPlaying ? pause() : play());
  document.getElementById("nextBtn").addEventListener("click", nextTrack);
  document.getElementById("prevBtn").addEventListener("click", prevTrack);
  // Like/heart toggle in the now-playing bar
  npHeart.addEventListener("click", () => npHeart.classList.toggle("liked"));

  // Scrub bar: clicking anywhere on it jumps playback to that position
  const progressBar = document.getElementById("progressBar");
  progressBar.addEventListener("click", (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, pct * duration));
    elapsed = newTime;
    if (allSongs[currentIdx].src){ audioPlayer.currentTime = newTime; }
    updateProgress();
  });

  // Volume bar: clicking anywhere on it sets both the visual fill AND
  // the real <audio> element's volume (0–1).
  const volBar = document.getElementById("volBar");
  const volFill = document.getElementById("volFill");
  const volKnob = document.getElementById("volKnob");
  volBar.addEventListener("click", (e) => {
    const rect = volBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    volFill.style.width = (pct * 100) + "%";
    volKnob.style.left = (pct * 100) + "%";
    audioPlayer.volume = pct;
  });
  audioPlayer.volume = 0.7; // matches the default 70% fill shown in the markup

  // Load the first track into the now-playing bar on page load (paused)
  loadTrack(0);

  // ---------- Sidebar nav ----------
  // Switching between "Listen Now" and "Library" just swaps the active
  // button styling and updates the page title — there's no real routing.
  document.getElementById("mainNav").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    document.querySelectorAll("#mainNav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("viewTitle").textContent = btn.textContent.trim();
  });

  // ============================================================
  // 1-Minute Song Rush — team quiz game
  // Self-contained in its own IIFE so its variables/functions don't
  // clash with the code above. Opened via window.openGame(songs, points,
  // label), called from the Round 1 / Round 2 card click handlers above.
  // ============================================================
  (function(){
    // ---- Tunable game constants ----
    const TOTAL_SONGS = 12;     // number of correct guesses needed to win a round
    const START_SECONDS = 60;   // starting countdown time
    const BONUS_SECONDS = 15;   // time added per correct guess

    // ---- Cached DOM references ----
    const overlay = document.getElementById("gameOverlay");
    const introEl = document.getElementById("gameIntro");
    const playEl = document.getElementById("gamePlay");
    const endEl = document.getElementById("gameEnd");
    const roundInfoEl = document.getElementById("gRoundInfo");
    const startGroup1Btn = document.getElementById("gameStartGroup1Btn");
    const startGroup2Btn = document.getElementById("gameStartGroup2Btn");
    const againBtn = document.getElementById("gameAgainBtn");
    const closeBtn = document.getElementById("gameClose");
    const timerEl = document.getElementById("gTimer");
    const progressEl = document.getElementById("gProgress");
    const artbox = document.getElementById("gArtbox");
    const hintMain = document.getElementById("gHintMain");
    const hintSub = document.getElementById("gHintSub");
    const searchInput = document.getElementById("gSearchInput");
    const searchDropdown = document.getElementById("gSearchDropdown");
    const submitBtn = document.getElementById("gSubmitBtn");
    const passBtn = document.getElementById("gPassBtn");
    const pauseBtn = document.getElementById("gPauseBtn");
    const statusMsg = document.getElementById("gStatusMsg");
    const correctEl = document.getElementById("gCorrect");
    const bonusEl = document.getElementById("gBonus");
    const resultEl = document.getElementById("gResult");
    const scoreEl = document.getElementById("gScore");
    const group1ScoreEl = document.getElementById("group1Score");
    const group2ScoreEl = document.getElementById("group2Score");
    const gameAudio = document.getElementById("gameAudio"); // real <audio> for the mystery song

    // ---- Scoreboard state (persists across rounds/games) ----
    const groupScores = { 1: 0, 2: 0 };

    // ---- Per-round session state ----
    let currentSongs = [];        // the 12 songs belonging to whichever playlist was clicked
    let pointsPerSong = 1;        // 1 for Round 1, 2 for Round 2 (set by openGame)
    let roundLabel = "";          // playlist title, shown in the intro screen
    let roundImg = "";            // playlist cover photo (if set), shown behind the lyric box
    let activeGroup = null;       // 1 or 2 — which group is currently playing this round
    let queue = [];                // shuffled copy of currentSongs, fixed at 12 (no growth)
    let qIndex = 0;
    let correctCount = 0;
    let correctlyAnsweredTitles = new Set(); // titles already correctly guessed this round
    let secondsLeft = START_SECONDS;
    let gTimer = null;
    let answered = false;
    let gActiveSuggestionIdx = -1;
    let isPaused = false;
    let pauseTimeout = null;
    let currentLyrics = "";
    let karaokeTimeouts = [];     // pending word-reveal timers (fixed-pace fallback mode)
    let karaokeAudioHandler = null; // active gameAudio "timeupdate" listener (real-timestamp mode), if any

    // Fisher–Yates shuffle — returns a new shuffled copy, doesn't mutate the input
    function shuffle(arr){
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Formats a seconds count as "m:ss" for the countdown display
    function fmtTime(s){
      s = Math.max(0, s);
      return Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
    }

    // Hides and clears the in-game guess-suggestion dropdown
    function gCloseDropdown(){
      searchDropdown.classList.remove("open");
      searchDropdown.innerHTML = "";
      gActiveSuggestionIdx = -1;
    }

    // Called when the player picks a suggestion from the dropdown
    function gSelectSuggestion(title){
      searchInput.value = title;
      gCloseDropdown();
      searchInput.focus();
    }

    // Keyboard (arrow-key) navigation highlighting for the guess dropdown
    function gUpdateActiveSuggestion(items){
      items.forEach((el, i) => el.classList.toggle("active", i === gActiveSuggestionIdx));
      if (gActiveSuggestionIdx >= 0) {
        items[gActiveSuggestionIdx].scrollIntoView({ block: "nearest" });
      }
    }

    // As the player types a guess: show up to 8 matching titles from
    // THIS round's own 12-song playlist (not the whole app's songs).
    searchInput.addEventListener("input", (e) => {
      const rawQuery = e.target.value.trim();
      const query = rawQuery.toLowerCase();
      gActiveSuggestionIdx = -1;

      if (!query) {
        gCloseDropdown();
        return;
      }

      const filtered = currentSongs.filter(song => song.title.toLowerCase().includes(query));

      if (!filtered.length) {
        gCloseDropdown();
        return;
      }

      const suggestions = filtered.slice(0, 8);
      searchDropdown.innerHTML = suggestions.map(song =>
        `<div class="g-search-suggestion" data-title="${escapeHtml(song.title)}">${highlightMatch(song.title, query)}</div>`
      ).join("");
      searchDropdown.classList.add("open");

      searchDropdown.querySelectorAll(".g-search-suggestion").forEach(el => {
        el.addEventListener("mousedown", (ev) => {
          ev.preventDefault();
          gSelectSuggestion(el.dataset.title);
        });
      });
    });

    // Re-open the dropdown if the guess input is refocused with existing text
    searchInput.addEventListener("focus", () => {
      if (searchInput.value.trim() && searchDropdown.innerHTML) {
        searchDropdown.classList.add("open");
      }
    });

    // Clicking outside the guess input/dropdown closes the dropdown
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".g-search-box")) {
        gCloseDropdown();
      }
    });

    // Opens the game modal for a specific playlist. Called from the
    // Round 1 / Round 2 card click handlers above with that playlist's
    // songs, its point value (1 or 2), and its title for display.
    // Exposed on `window` at the bottom of this IIFE.
    function openGame(songs, points, label, img){
      currentSongs = songs;
      pointsPerSong = points;
      roundLabel = label;
      roundImg = img || "";
      overlay.classList.add("open");
      showIntroPanel();
    }

    // Shows the intro/group-select screen without resetting which
    // playlist/points are active — used both by openGame() and by
    // "Play Again" (so replaying the same playlist just re-asks which
    // group is playing next, instead of jumping back to the card grid).
    function showIntroPanel(){
      introEl.style.display = "";
      playEl.style.display = "none";
      endEl.style.display = "none";
      roundInfoEl.textContent = `Playing "${roundLabel}" — each correct song is worth ${pointsPerSong} point${pointsPerSong > 1 ? "s" : ""}.`;
    }

    // Closes the game modal and stops any running timers/audio
    function closeGame(){
      overlay.classList.remove("open");
      clearInterval(gTimer);
      clearTimeout(pauseTimeout);
      stopKaraoke();
      gameAudio.pause();
    }

    // Starts a new round for the given group (1 or 2): builds a fresh
    // shuffled 12-song queue from currentSongs, resets all round
    // counters, shows the play screen, and starts the countdown.
    function startGame(group){
      activeGroup = group;
      queue = shuffle(currentSongs).slice(0, TOTAL_SONGS);
      qIndex = 0;
      correctCount = 0;
      correctlyAnsweredTitles = new Set();
      secondsLeft = START_SECONDS;
      isPaused = false;
      clearTimeout(pauseTimeout);
      introEl.style.display = "none";
      endEl.style.display = "none";
      playEl.style.display = "";
      timerEl.classList.remove("warn");
      updateTimerDisplay();
      updateCorrectDisplay();
      renderQuestion();
      clearInterval(gTimer);
      gTimer = setInterval(() => {
        if (isPaused) return; // freeze the countdown while a pause is active
        secondsLeft -= 1;
        updateTimerDisplay();
        if (secondsLeft <= 0){
          finishGame(false);
        }
      }, 1000);
    }

    // Updates the big countdown number and its "low time" warning pulse
    function updateTimerDisplay(){
      timerEl.textContent = fmtTime(secondsLeft);
      timerEl.classList.toggle("warn", secondsLeft <= 10 && secondsLeft > 0);
    }

    // Updates the "✓ X of 12 correct" readout
    function updateCorrectDisplay(){
      correctEl.textContent = "✓ " + correctCount + " of " + TOTAL_SONGS + " correct";
    }

    // Updates the Group 1 / Group 2 numbers in the main-page scoreboard
    function updateScoreboard(){
      group1ScoreEl.textContent = groupScores[1];
      group2ScoreEl.textContent = groupScores[2];
    }

    // Finds the next round-song to ask about, searching forward from
    // `fromIndex` (with wraparound) within the SAME fixed 12-song queue,
    // skipping any song already correctly answered this round. This is
    // how "loop back to song 1 if there's time and it wasn't answered"
    // works — the queue never grows past 12, it just wraps around.
    function findNextUnansweredIndex(fromIndex){
      for (let step = 1; step <= queue.length; step++){
        const idx = (fromIndex + step) % queue.length;
        if (!correctlyAnsweredTitles.has(queue[idx].title)) return idx;
      }
      return -1; // everything in the queue has already been answered correctly
    }

    // Stops any in-progress lyric reveal — both the fixed-pace fallback
    // (pending setTimeouts) and the real-timestamp mode (a "timeupdate"
    // listener on gameAudio). Called whenever the lyric line changes, the
    // round pauses, or the game closes, so nothing fires late onto the
    // wrong song.
    function stopKaraoke(){
      karaokeTimeouts.forEach(t => clearTimeout(t));
      karaokeTimeouts = [];
      if (karaokeAudioHandler){
        gameAudio.removeEventListener("timeupdate", karaokeAudioHandler);
        karaokeAudioHandler = null;
      }
    }

    // Fixed-pace karaoke reveal (fallback for songs with no [time] tags,
    // or no audio to sync to): splits the line into words, shows them all
    // immediately at low opacity, then "lights up" one word at a time on
    // a plain timer — same visual rhythm as karaoke captions, just not
    // tied to the actual song.
    function playKaraokeLyrics(text){
      stopKaraoke();
      const words = text.split(" ").filter(Boolean);
      hintMain.innerHTML = words.map(w => `<span class="karaoke-word">${escapeHtml(w)}</span>`).join(" ");
      const wordEls = hintMain.querySelectorAll(".karaoke-word");
      const stepMs = 380; // pace between each word lighting up
      wordEls.forEach((el, i) => {
        const t = setTimeout(() => { el.classList.add("lit"); }, i * stepMs);
        karaokeTimeouts.push(t);
      });
    }

    // Real-timestamp karaoke reveal: lights up each word exactly when
    // gameAudio's actual playback position reaches that word's declared
    // [time]. This stays perfectly synced through pausing/resuming (and
    // even seeking) because it reads the real audio clock on every
    // "timeupdate" tick instead of running its own independent timer.
    function playTimedKaraoke(timedWords){
      stopKaraoke();
      hintMain.innerHTML = timedWords.map(tw => `<span class="karaoke-word">${escapeHtml(tw.word)}</span>`).join(" ");
      const wordEls = hintMain.querySelectorAll(".karaoke-word");

      karaokeAudioHandler = () => {
        const t = gameAudio.currentTime;
        timedWords.forEach((tw, i) => {
          if (t >= tw.time) wordEls[i].classList.add("lit");
        });
      };
      gameAudio.addEventListener("timeupdate", karaokeAudioHandler);
      karaokeAudioHandler(); // run once immediately in case some words' times already passed
    }

    // Picks the right reveal mode for a song's lyrics: real timestamp
    // sync if it has both [time] tags AND a playable "src", otherwise
    // the plain fixed-pace fallback (with any stray [time] tags stripped
    // out so they never show up as visible text).
    function revealLyricsFor(sg, text){
      const timedWords = sg.src ? parseTimedLyrics(text) : null;
      if (timedWords){
        playTimedKaraoke(timedWords);
      } else {
        playKaraokeLyrics(stripTimestamps(text));
      }
    }

    // Renders the current round: shows the lyric hint (karaoke-style, and
    // plays the song's real audio if it has a src), resets the guess
    // input/status, and resets the pause button — pausing is 1 use PER
    // SONG, so it's always available again here, even for a song looping
    // back around.
    function renderQuestion(){
      answered = false;
      isPaused = false;
      clearTimeout(pauseTimeout);
      pauseBtn.disabled = false;
      pauseBtn.textContent = "Pause 12s";

      const sg = queue[qIndex];
      progressEl.textContent = "Song " + (qIndex + 1) + " of " + TOTAL_SONGS;
      updateCorrectDisplay();

      // Show the playlist's own cover photo (with a dark overlay so the
      // lyric text stays readable) if one was set; otherwise fall back
      // to the plain gradient look, same as before.
      if (roundImg){
        artbox.style.backgroundImage = `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url('${roundImg}')`;
        artbox.style.backgroundSize = "cover";
        artbox.style.backgroundPosition = "center";
      } else {
        artbox.style.backgroundImage = "none";
        artbox.style.background = art(currentSongs.indexOf(sg));
      }

      currentLyrics = (sg.lyrics && sg.lyrics.trim())
        ? sg.lyrics
        : "🎤 Add this song's lyric line in the songs list";
      revealLyricsFor(sg, currentLyrics);
      hintSub.textContent = sg.artist + " · " + roundLabel;

      searchInput.value = "";
      statusMsg.textContent = "";
      statusMsg.className = "g-status-msg";
      gCloseDropdown();
      searchInput.focus();

      // Auto-play this song's real audio as an extra hint, if one was
      // provided in its "src" field. Silent (lyrics-only) otherwise.
      gameAudio.pause();
      if (sg.src){
        gameAudio.src = sg.src;
        gameAudio.currentTime = 0;
        gameAudio.play().catch(() => {});
      } else {
        gameAudio.removeAttribute("src");
      }
    }

    // Shared "move to the next round-song" logic used after a
    // correct/wrong answer is submitted.
    function advanceQuestion(delay){
      setTimeout(() => {
        if (correctCount >= TOTAL_SONGS){
          finishGame(true);
          return;
        }
        const next = findNextUnansweredIndex(qIndex);
        if (next === -1){
          finishGame(true); // safety net — shouldn't normally hit this
          return;
        }
        qIndex = next;
        renderQuestion();
      }, delay);
    }

    // Handles the player submitting a guess (Submit button or Enter key).
    // A loose substring match is used (either direction) so minor typos
    // or partial titles still count as correct. On a correct guess, the
    // active group is awarded `pointsPerSong` points on the scoreboard.
    function handleSearchSubmit(){
      if (answered) return;

      gCloseDropdown();
      const query = searchInput.value.trim().toLowerCase();
      if (!query) return;

      const currentSong = queue[qIndex];
      const targetTitle = currentSong.title.toLowerCase();
      const isCorrect = targetTitle.includes(query) || query.includes(targetTitle);

      answered = true;
      gameAudio.pause();

      if (isCorrect){
        statusMsg.textContent = "✓ Correct! Song found.";
        statusMsg.className = "g-status-msg correct";
        correctlyAnsweredTitles.add(currentSong.title);
        correctCount += 1;
        updateCorrectDisplay();
        secondsLeft += BONUS_SECONDS;
        updateTimerDisplay();

        groupScores[activeGroup] += pointsPerSong;
        updateScoreboard();

        bonusEl.textContent = "+" + pointsPerSong + (pointsPerSong > 1 ? " pts" : " pt") + " · +15s";
        bonusEl.classList.remove("show");
        void bonusEl.offsetWidth; // force reflow so the animation replays
        bonusEl.classList.add("show");
      } else {
        statusMsg.textContent = `✗ Not found! It was "${currentSong.title}"`;
        statusMsg.className = "g-status-msg wrong";
      }

      advanceQuestion(1200);
    }

    // Pass = skip for now, not "give up". The song is put back later in
    // the SAME fixed 12-song queue so it loops around again if there's
    // still time left — it does NOT reveal the answer and does NOT
    // count as answered/correct.
    function handlePass(){
      if (answered) return;
      answered = true;
      gCloseDropdown();
      gameAudio.pause();

      const currentSong = queue[qIndex];
      queue.splice(qIndex, 1);   // pull it out of its current spot
      queue.push(currentSong);   // send it to the back of the line

      statusMsg.textContent = "⏭ Skipped — it'll come back around later";
      statusMsg.className = "g-status-msg skip";

      setTimeout(() => {
        // Whatever slid into qIndex after the splice might already be
        // correctly answered (from earlier in the round) — find the
        // next genuinely unanswered one from here, same as advanceQuestion.
        const next = findNextUnansweredIndex((qIndex - 1 + queue.length) % queue.length);
        if (next !== -1) qIndex = next;
        renderQuestion();
      }, 900);
    }

    // Pause hides the lyric hint (and mutes the song's audio) for 12
    // seconds and freezes the countdown while paused, then automatically
    // resumes both. Limited to ONE use per song — renderQuestion() resets
    // it every time a new round-song is shown, including one looping
    // back around, so the budget is "1 pause per song", not a session total.
    function handlePauseSong(){
      if (isPaused || answered) return;

      isPaused = true;
      pauseBtn.disabled = true;
      pauseBtn.textContent = "Paused…";
      stopKaraoke(); // stop any pending word-reveals while hidden
      hintMain.textContent = "⏸ Lyrics paused for 12s…";
      gameAudio.pause();

      clearTimeout(pauseTimeout);
      pauseTimeout = setTimeout(() => {
        isPaused = false;
        pauseBtn.disabled = false;
        pauseBtn.textContent = "Pause 12s";
        if (!answered){
          const sg = queue[qIndex];
          // Resume the audio first (currentTime wasn't reset by pause(),
          // just held) so a real-timestamp reveal immediately reflects
          // where playback actually is; the fixed-pace fallback just
          // restarts its word timing from the top either way.
          if (sg.src){ gameAudio.play().catch(() => {}); }
          revealLyricsFor(sg, currentLyrics);
        }
      }, 12000);
    }

    // Wire up the three action buttons
    submitBtn.addEventListener("click", handleSearchSubmit);
    passBtn.addEventListener("click", handlePass);
    pauseBtn.addEventListener("click", handlePauseSong);

    // Keyboard handling for the guess input
    searchInput.addEventListener("keydown", (e) => {
      const items = Array.from(searchDropdown.querySelectorAll(".g-search-suggestion"));
      const dropdownOpen = items.length && searchDropdown.classList.contains("open");

      if (e.key === "ArrowDown" && dropdownOpen) {
        e.preventDefault();
        gActiveSuggestionIdx = (gActiveSuggestionIdx + 1) % items.length;
        gUpdateActiveSuggestion(items);
      } else if (e.key === "ArrowUp" && dropdownOpen) {
        e.preventDefault();
        gActiveSuggestionIdx = (gActiveSuggestionIdx - 1 + items.length) % items.length;
        gUpdateActiveSuggestion(items);
      } else if (e.key === "Enter") {
        if (dropdownOpen && gActiveSuggestionIdx >= 0) {
          e.preventDefault();
          gSelectSuggestion(items[gActiveSuggestionIdx].dataset.title);
        } else {
          gCloseDropdown();
          handleSearchSubmit();
        }
      } else if (e.key === "Escape") {
        gCloseDropdown();
      }
    });

    // Ends the round, stops the countdown/audio, and shows the results
    // screen — either a win (all 12 correct) or a "time's up" summary,
    // including how many points the active group earned this round.
    function finishGame(won){
      clearInterval(gTimer);
      gameAudio.pause();
      playEl.style.display = "none";
      endEl.style.display = "";

      const pointsEarned = correctCount * pointsPerSong;
      if (won){
        resultEl.textContent = "🔥 Group " + activeGroup + " beat the clock!";
        scoreEl.textContent = "All " + TOTAL_SONGS + " songs guessed with " + fmtTime(secondsLeft) + " left — +" + pointsEarned + " points for Group " + activeGroup + ".";
      } else {
        resultEl.textContent = "⏱️ Time's up!";
        scoreEl.textContent = "Group " + activeGroup + " guessed " + correctCount + " of " + TOTAL_SONGS + " songs — +" + pointsEarned + " points.";
      }
    }

    // Start (pick a group), Play Again (re-pick a group for the same
    // playlist), Close, and click-outside-to-close wiring
    startGroup1Btn.addEventListener("click", () => startGame(1));
    startGroup2Btn.addEventListener("click", () => startGame(2));
    againBtn.addEventListener("click", showIntroPanel);
    closeBtn.addEventListener("click", closeGame);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeGame(); });

    // Expose openGame() globally so the Round 1 / Round 2 card click
    // handlers defined earlier in this file can open the game.
    window.openGame = openGame;
  })();

})();
