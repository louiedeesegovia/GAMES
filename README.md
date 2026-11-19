# Bible Games

A collection of browser-based group games for Bible drills, song drills, and the classroom. Each game is a plain HTML page: no install, no build step, no server. Built for a facilitator running two or more teams from one shared screen.

## Quick start

1. Clone the repo or download it as a ZIP.
2. Open any game's `.html` file in a modern browser (double-click it).
3. Fill in the setup screen (where there is one) and start playing.

Keep each game inside its own folder. Several games load audio or images from the files sitting next to them.

## Games at a glance

| Game | Teams | What it is |
|---|---|---|
| **Box Jump** | 2 players | Answer questions to hop across a lane of 13 mystery boxes |
| **Bible Detectives** | Any | Game-master case files with clues; reveal the answer when ready |
| **Deal or No Deal** | 2 groups | Trivia-powered briefcase game with a Banker |
| **Treasure Hunting** | 2 groups | Answer questions to unlock keys, open chests, steal prizes |
| **Poetry Scrolls** | 2–4 teams | Decode poems from highlighted words under a countdown |
| **PicturePicture** | 2 groups | Guess the picture on a per-team time bank |
| **Heardle** | 2 teams | Name the song from ever-longer audio snippets |
| **The Spotify Game** | 2 contestants | Four lyric rounds in a Spotify-style player |
| **PassPausePlay** | 2 groups | "1-Minute Song Rush" in a music-app style UI |
| **Classroom Quiz Game** | Any | General-purpose quiz with teams, points, and a steal wheel |

## Bible drill

### Box Jump
`Bible drill/Box Jump/box jump.html`

Two players (Purple and Red) race down their own lanes of 13 boxes to reach the finish platform. Every box asks a multiple-choice question first, and the box's hidden type is only revealed after a correct answer:

- **Question** ❓: safe. Step on it and score 10 points.
- **Cement** 🪨: safe, and earns a bonus spin of the wheel (extra hearts and/or stars).
- **Empty** 💣: a trap. Even with a correct answer, the player falls, losing a life and going back to the start.

A wrong answer also costs a life and sends the player back to the start. Each player has 3 lives (out of lives means out of the game) and a 45-second timer per question. Before play, the setup screen lets you write the question, four choices, and correct answer for each box, and click a box to cycle its type.

### Bible Detectives
`Bible Detectives.html` and `Bible Detectives.txt` in `Bible drill/Bible Detectives/`

A "case file" game. The game master fills in a setup screen (up to 16 optional fields per case, such as Crime, Location, Clues, Hint, plus a final answer) for 4 difficulty levels (Easy, Intermediate, Advanced, Expert) with 10 cases each. During play, teams pick a level, open a case, and the game master clicks **Reveal Answer** when ready.

`Bible Detectives.txt` is a ready-made bank of 39 cases (10 Easy, 9 Intermediate, 10 Advanced, 10 Expert) to paste into the setup boxes. Copy only the text after each label's colon.

### Deal or No Deal
`Bible drill/Deal or No Deal/Deal or No Deal (3).html`

A two-group tactical trivia take on the TV classic. The board has 26 briefcases holding 1 to 2,000,000 points.

- Each group picks a personal briefcase, then groups take turns opening cases by answering a Bible-numbers trivia question (30 seconds).
- A correct answer clears the case safely. A wrong answer adds that case's value to the group's personal penalty total.
- Between rounds the Banker makes an offer based on the remaining values. Each group independently chooses **Deal** or **No Deal**.
- A group's final result is its payout minus its accumulated penalties (never below zero).

Files `(1)`, `(2)`, and `(3)` are saved iterations of the same game. Questions live in the `triviaBank` array in the file.

### Treasure Hunting
`Bible drill/Treasure Hunting/treasure-hunting (3).html`

Two groups (⚔️ and 🛡️) start with 3 lives each. The board has 32 keys, each tied to a question, and 32 chests. Answering a question correctly unlocks that key's matching chest. The tabs show **Keys**, **Chests**, and a **Scoreboard**.

- Answers are typed and must match the stored answer exactly (case-insensitive). A word bank panel lists the possible answers and crosses them off as they're used.
- A wrong answer just lets the group try again until the clock runs out.
- Prizes in the chest pool: 35, 30, 25, 20, 15, 10 (x2), 5 (x3), 3 (x4), 1 (x5), 0 (x6), plus 7 cursed chests that cost a life.
- Each key has a 60-second timer. When time runs out, the other group (if it still has lives) gets one chance to steal the key.
- Questions live in the `PAIRS` array in the file. Files `(1)`, `(2)`, and `(3)` are saved iterations.

### Poetry Scrolls
`Bible drill/Poetry Scrolls/poetry scrolls.html`

A parchment-themed game for 2 to 4 teams. In the "Scribe's Setup" you enter the team names and, for each scroll, a poem title, the poem, words to highlight, an optional hint, and the answer. There are 4 levels with 10 scrolls each:

| Level | Points |
|---|---|
| Easy | 3 |
| Intermediate | 5 |
| Advanced | 7 |
| Expert | 10 |

Each scroll has a 3-minute timer. A wrong answer disables that team for the scroll, passes the turn, and resets the clock to 2:30. A hint can be revealed on request.

### PicturePicture
`Bible drill/PicturePicture/Picture_Pass&Play.html`

A two-group picture-guessing game where each group has its own 3-minute clock. In the setup panel you set the group names and a category, then add questions as an image path plus the answer. Teams alternate questions, with a 5-second countdown before each picture is revealed.

- Correct answer: +5 seconds
- Wrong answer: -10 seconds
- Skip: -15 seconds

There are also Pause and End Game controls. The `round1` to `round8` folders next to the HTML hold 99 PNG clue images; reference them by relative path, for example `round1/01.png`.

## Song drill

### Heardle
`Song drill/Heardle/round1/Heardle (1).html`

A Heardle-style game for two teams. Pick a category (**Hymnal**, **Special Song**, **Children Song**, or **Bisaya**), then identify the song from audio snippets that grow longer with each step (1, 2, 4, 7, 11, then 16 seconds). Players guess via a search box, or skip to unlock more audio. There are 6 guesses per song and a 45-second round timer. Fewer clips needed means more points for the active team.

The 28 clips (`h1`-`h7`, `s1`-`s7`, `c1`-`c7`, `b1`-`b7`) sit beside the HTML file. Songs are defined in the `SONGS_DATABASE` object. The `round2/` folder is an empty placeholder.

### The Spotify Game
`Song drill/The Spotify Game/music/spotify_game.html`

Four lyric rounds in a Spotify-style interface, 10 songs per round, a 60-second timer, and a steal rule: if the active contestant misses, the other contestant can answer for the full points.

| Round | Name | Task | Points |
|---|---|---|---|
| 1 | Sing in the Blank! | Fill in the missing lyric (type or say it) | 1 |
| 2 | The Choosing One | Pick the correct lyric, A or B | 2 |
| 3 | Picsing a Broken Song! | Guess the lyric from picture-clue GIFs | 3 |
| 4 | Ayu-Sing Mo! | Arrange the jumbled lyrics | 4 |

See [Known issues](#known-issues) before using this one; the media paths need editing.

### PassPausePlay
`Song drill/PassPausePlay/` (`index.html`, `style.css`, `script.js`)

A music-app style interface wrapping a team game called **1-Minute Song Rush**. There are 12 playlists of 12 songs each: six Round 1 playlists worth 1 point per correct song (Be Still, Follow Me, Walk by Faith, Praise the Lord, Fear Not, Still Waters) and six Round 2 playlists worth 2 points (Salt of the Earth, Bread of Life, Take My Life, Nearer, Pass Me Not, Give Me Jesus). A scoreboard tracks Group 1 and Group 2, and each group can **Pass** or **Pause 12s** during its turn.

Lyrics can optionally be karaoke-timed with tags like `[0.0]Amazing [0.6]grace`. Songs and lyrics are defined in `script.js`; see [Known issues](#known-issues).

## Classroom

### Classroom Quiz Game
`Classroom/Group game #01/classroom_group_game.html`

A general-purpose quiz you configure in four steps: name the game, add teams, add questions, and choose game settings (seconds per question).

- Questions have text or picture answer options (images are uploaded from your computer), one correct option, and a point value.
- **Load 5 sample questions** gives you something to try immediately.
- During play: **Extend +30s**, a **Steal Time!** spin wheel, a full scoreboard, and **Play Again (same setup)** or **New Game / Edit Setup** at the end.

## Repository layout

```
.
├── Bible drill/
│   ├── Bible Detectives/     Bible Detectives.html, Bible Detectives.txt
│   ├── Box Jump/             box jump.html
│   ├── Deal or No Deal/      Deal or No Deal (1-3).html
│   ├── PicturePicture/       Picture_Pass&Play.html, round1-round8/ (PNG clues)
│   ├── Poetry Scrolls/       poetry scrolls.html
│   └── Treasure Hunting/     treasure-hunting (1-3).html
├── Classroom/
│   └── Group game #01/       classroom_group_game.html
└── Song drill/
    ├── Heardle/round1/       Heardle (1).html + 28 MP3 clips
    ├── PassPausePlay/        index.html, style.css, script.js
    └── The Spotify Game/     music/ (spotify_game.html + 30 MP3s), gif/ (10 GIFs)
```

The files named `temp` are placeholders that keep otherwise-empty folders in the repo.

## Customizing content

- **Setup screens** (Box Jump, Bible Detectives, Poetry Scrolls, PicturePicture, Classroom Quiz Game): enter your questions each time you launch the game. Nothing is saved between page reloads, so prepare your content in a text file first and paste it in.
- **Edit the file** (Deal or No Deal, Treasure Hunting, Heardle, The Spotify Game, PassPausePlay): open the HTML (or `script.js`) in a text editor and change the content arrays: `triviaBank`, `PAIRS`, `SONGS_DATABASE`, `rounds`.

## Known issues

- **The Spotify Game uses absolute paths from the original author's machine.** In `spotify_game.html`, the `songFiles` and `imageFiles` objects point at `/home/louieds/Music/...`, so audio and GIFs won't load elsewhere. Change them to relative paths: `r2s0.mp3` for the audio (same folder as the HTML) and `../gif/0.gif` for the GIFs. Round 1 audio (`r1s0.mp3` to `r1s9.mp3`) is not in the repo, and several lyric entries are still placeholders (`No Lyrics` / `No Answer`).
- **PassPausePlay ships with placeholder content.** Every song has a stub title, `Lyric line N...` lyrics, and an empty `src`. Fill in real songs and lyrics in `script.js` before using it.
- **Bible Detectives expects a `man.png`** (a detective icon) beside the HTML file, but the image isn't in the repo. Add one or remove the `<img>` tag.
- **Web fonts need internet.** Deal or No Deal, Treasure Hunting, Poetry Scrolls, PicturePicture, The Spotify Game, and Classroom Quiz Game load fonts from Google Fonts. Offline, they still run but fall back to system fonts.
- **Duplicate versions.** Deal or No Deal and Treasure Hunting each have three saved copies, `(1)` to `(3)`.
