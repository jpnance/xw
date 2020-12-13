# xw
Console-based crossword solving client

![](https://raw.githubusercontent.com/jpnance/xw/main/xw.png)

## WAIT JUST A SECOND (15)
Your eyes do not deceive you. Command-line cruciverbalists have finally gotten their day. xw is a console-based crossword solver that offers a fresh take on the digital solving experience. It uses vi-like key bindings and modes, can read any PUZ file (whether local or remote), and even tracks some stats as you solve. It's implemented entirely in Node.js and, for a console application, looks pretty darn good, if I do say so myself.

## HOW DO I INSTALL IT? (15)
Well, for now, the easiest way is to do `sudo npm install -g jpnance/xw` (you'll need Node.js and npm, of course). That'll install the latest (and greatest?) version of xw straight from this very repository.

## HMM... OKAY... WHAT NEXT? (15)
The most basic way to start up xw is with `xw <filename>` where `filename` is a PUZ file you've already downloaded. Go to your [favorite](https://amandarafkin.blogspot.com/) [indie](https://www.brendanemmettquigley.com/) [constructor's](https://cruzzles.blogspot.com/) [blog](https://toughasnails.net/) and grab a PUZ to give it a shot.

If you get sick of using valuable hard drive space on two-kilobyte puzzles, `xw <URL>` will work, too, as long as the URL links directly to a PUZ file. Unfortunately, this means that Dropbox and Google Drive links don't work (yet!). In those cases, you're better off just downloading the PUZ and opening it locally.

Finally, there's one more syntax that's a little wonky but is what I use most often. You see, I've [predefined](https://github.com/jpnance/xw/blob/main/models/grabber.js) a bunch of bookmarks to the puzzles I do most often: [USA Today](https://puzzles.usatoday.com/), [New York Times](https://www.nytimes.com/crosswords/game/daily), among many others. For most of these services, `xw <puzzle service short name>` will instantly grab the latest puzzle that service has to offer. `xw lat` will fetch the latest [Los Angeles Times puzzle](https://www.latimes.com/games/daily-crossword) and `xw club72` will retrieve the latest [Tim Croce concoction](https://club72.wordpress.com/) (yes! RSS feeds work!), and so on. You'll have to browse through the others to see what else is available.

In the case of the New York Times Crossword, though, there's a little extra work needed. First, of course, you'll have to have an NYTXW subscription. Then, you'll need to copy and paste your `NYT-S` cookie from your browser into a file called `.xw.conf` at the root of wherever your system installed xw, most likely `/usr/local/lib/node_modules/xw`. The only line in that file should be:

	{ "nytCookie": "NYT-S=<cookie value which is pretty long and has a lot of random looking characters>" }

Then, `xw nyt` will work just like the other short names. (I know this part is a bit involved. I hope to improve it soon.)

Oh, yeah, and if you want to do a puzzle from a specific date, try something like `xw usa-today --date 2020-09-20`.

## IT WON'T LET ME TYPE... (15)
Yeah, once you start it up, you may realize it acts a little strange. Think of it very much like you're in vi and, by default, you start in command mode.

* Use `i` to go into insert mode and then you'll be able to start typing
* `ESC` or `enter` will get you out of insert mode and back into command mode
* `h`, `j`, `k`, and `l` will move the cursor around in command mode
* `H`, `J`, `K`, and `L` will do the same in insert mode (very useful so you can navigate without having to leave insert mode)
* The arrow keys work, too
* `Spacebar` switches between across and down
* `w` and `b` in command mode (and their uppercase counterparts in insert mode) will take you to the next and previous numerical clues, respectively
* Start a rebus with `*` and commit it with `enter`
* `/` in insert mode will drop an anchor at the current square; the next time you press `enter`, the cursor will automatically be warped to that anchor spot (this is a killer feature exclusive to xw)
* In command mode, jump directly to clue 42-down by typing `/42d`
* `:check` will show you any errors you have in your solution
* `:reveal` will reveal all of the answers, marking the squares you had wrong

There are even some other things in there but I'll document those another day. I think all that is enough to get you started.

## ...AND NOW I CAN'T QUIT (15)
I know! Isn't it great being able to bang through crosswords at a humble terminal? It's so primal, so nat--

## NO, LIKE, LITERALLY (15)
Oh, right. Well, it wouldn't be vi-like if it were easy to exit, ha ha!

`:q` in command mode will do the trick (`:x` works, too). The ol' tried-and-true press-`ESC`-a-bunch-of-times-and-then-`:q` strategy works great.

Look, I know the vi-like schtick won't be for everybody. I'm considering making it optional but that'd be a bit into the future. This is the hacker's crossword solver and vi's two main modes of operation actually translate very well for crossword solving, in my opinion. xw works great for me and I really hope it'll work well for you, too.

## WOW! WHAT *CAN'T* IT DO? (15)
xw isn't perfect and it's certainly not "done". Here are some things that you might be disappointed to learn that you can't presently do:

* See cross-referenced clues
* Save progress on a puzzle and come back to it
* Navigate with `CTRL+<arrow>` as many other solvers allow
* Open JPZ or IPUZ files (although cryptics seem to work just fine, as long as they're PUZ files!)
* Jump to a clue based on a search of its text
* Construct your own puzzle

To varying degrees, I'm working on all of those, roughly in that order of priority.

## WHO ARE YOU, ANYWAY? (15)
I'm Patrick. I--get this--enjoy solving crossword puzzles and I also helped make a video game called [Deleveled](https://deleveledgame.com/).
