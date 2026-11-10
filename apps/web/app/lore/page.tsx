import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lore · Turtle Party",
  description: "How the First Wild Turtle started the Turtle Parties.",
};

// Tommy's lore, copied word for word from the home page of turtleparty.org (2026-11-09).
// Left out: his production note after the last paragraph, about a voice-over for the how-to-play video.
const LORE = [
  "Out of the magnificent combination of evolution with a touch of magic, there appeared a Wild Turtle. The First Wild Turtle roamed the earth watching the rise and fall of civilizations and transformations in the flora and fauna content over many eons. This mythical creature observed the natural world that we all live in for some time, entertaining itself by watching the dynamics of growth, struggle, diversity, creation, and destruction of many species. This was very thought provoking for her, but eventually Wild Turtle began to see the cycles of life repeat itself, and she became lonely. Wild Turtle was aware that there were many other turtles in the world and had observed many of them. But her spark of life was not complete without a full unity with others. She desired community, interaction, to have fun with other turtles!",
  "Wild Turtle consequentially swirled her magic rainbow spark around a few other Box Turtles, Giant Tortoises, and Leather backs, helping them realize their innate rainbow powers of infinite omniscience. She gathered these first few turtles to pitch a mission to help spread the spark of joy, and the ecstatic joys of diverse community to the other turtles of the world. They consented to the mission, finding it to perhaps be a fruitful and wholesome goal for the community of turtles at large. And so the wilds went out, spreading the word of a magical party. These gatherings would come to be known as Turtle Parties, where all turtles can come together to share their knowledge, train their skills, and to learn what their fellow turtles are capable of. They also brought along many Party Favors to share.",
  "They met in ideal, yet remote locations, typically gathering around a pond of some sort. The First Turtle Parties were one for the books, though typically small in size with only several dozens of turtles in attendance. These parties became widespread, though strictly unseen by human eyes, and eventually many regional and international Turtle Parties became highly attended events by turtles of all kinds. The appeal of traveling to different ponds to experience different regional iterations of Turtle Party interactions was and is still to today a highly sought after experience for turtles whose have found it in their hearts to have a community that they belong to.",
];

export default function LorePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="text-sm font-medium uppercase tracking-widest text-shell">Lore</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">The First Wild Turtle</h1>
      <div className="mt-8 space-y-6 text-lg leading-relaxed">
        {LORE.map((paragraph, i) => (
          <p key={i} className={i === 0 ? "first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-semibold first-letter:leading-none first-letter:text-shell" : undefined}>
            {paragraph}
          </p>
        ))}
      </div>
      <p className="mt-10 border-t border-line pt-4 text-sm text-muted">Written by Tommy, the maker of Turtle Party.</p>
    </main>
  );
}
