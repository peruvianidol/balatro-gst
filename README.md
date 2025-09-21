# Balatro Gold Sticker Tracker

## Background

If you haven't played the video game *[Balatro](https://www.playbalatro.com/)*, well, it's probably for the best. Congratulations on having *sooo* much free time to spend in more productive ways.

In a nutshell, *Balatro* is a poker-themed, deck-building, roguelike. The goal is to make poker hands to beat an ever-increasing scoring goal with a limited number of hands and discards. You can modify the cards in your deck with various types of cards, seals, and other enhancements. You can also increase the amount of points a hand scores (e.g. increase a Pair to where it becomes the highest scoring hand). And accumulating special Joker cards can create synergies with your cards that can exponentially increase your score.

There's a number of difficult achievements in *Balatro* and probably the most difficult one is **Completionist++**, which requires you to win with all 150 jokers on *Gold Stake*, the game's highest difficulty. (Stakes are modifiers which compound each time you win a run.) Winning a run with a particular joker applies a sticker to the card of the highest color stake you've beaten.

## What the heck is this app already?

Keeping track of which Jokers you have **Gold Stickers** on is possible in the game, but I thought it would be useful to also track them outside of the game.

I made a JSON file with all 150 jokers, and used [Eleventy](https://11ty.dev) to display them all on a single page. I added some controls to sort and filter the jokers. Clicking on a joker will toggle a gold sticker on it. There's a counter that shows how many of the 150 jokers you have a sticker on, along with a button you can click to reset it.

The stickers are stored in `localStorage` so anyone visiting the page can keep track of their own joker stickers without having to log in.

## Web Dev Challenge

I made this for a [Hackathon](https://community.postman.com/t/hackathon-create-a-personal-app-win-500-2-weeks/84437) I saw on the Web Dev Challenge on [CodeTV](https://codetv.dev/) using [Postman](https://www.postman.com/).

Full disclosure, I'm a **Design System Engineer** (I use the term "engineer" loosely, I majored in sports journalism!), I mostly write HTML/CSS all day. So I vibe-coded the heck out of the trickier bits of this thing.

## Links

* [Website](https://balatro-gst.netlify.app/)
* [GitHub Repo](https://github.com/peruvianidol/balatro-gst)
* [Postman Notebook]()
