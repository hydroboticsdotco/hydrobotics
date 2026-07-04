export type Task = {
  id: string;
  name: string;
  category: string;
  durationSec: number;
  reward: number;
  prompt: string;
};

export const TASKS: Task[] = [
  {
    id: "pour-water",
    name: "Pour water into a cup",
    category: "Kitchen",
    durationSec: 30,
    reward: 10,
    prompt:
      "Pick up the cup, pour water in, and put it back down. Keep both hands and the cup fully in frame the whole time.",
  },
  {
    id: "open-drawer",
    name: "Open drawer & take an item",
    category: "Home",
    durationSec: 25,
    reward: 12,
    prompt:
      "Open the drawer, take one object out, then close the drawer. Move at a natural, steady pace.",
  },
  {
    id: "fold-shirt",
    name: "Fold a shirt",
    category: "Laundry",
    durationSec: 45,
    reward: 15,
    prompt:
      "Lay the shirt flat, fold the sleeves in, fold in half, and place it neatly. Full sequence, start to finish.",
  },
  {
    id: "stack-blocks",
    name: "Stack the blocks",
    category: "Tabletop",
    durationSec: 30,
    reward: 10,
    prompt:
      "Stack at least 3 blocks one by one into a tower. Keep your hands and the blocks clearly visible.",
  },
  {
    id: "wipe-table",
    name: "Wipe the table",
    category: "Cleaning",
    durationSec: 20,
    reward: 8,
    prompt:
      "Wipe the surface with a cloth in smooth strokes from one side to the other. Good even lighting.",
  },
  {
    id: "plug-cable",
    name: "Plug in a cable",
    category: "Workshop",
    durationSec: 20,
    reward: 14,
    prompt:
      "Pick up the cable and plug it into the port, then unplug it. Show the fine finger movement up close.",
  },
];

export function getTask(id: string | undefined): Task | undefined {
  return TASKS.find((t) => t.id === id);
}
