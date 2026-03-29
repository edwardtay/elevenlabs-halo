import type { Env } from './types';

const SEED_ENTRIES = [
  { id: 'physics-gravity', topic: 'gravity', content: 'Gravity is a fundamental force of nature that attracts objects with mass toward each other. On Earth, gravity gives weight to physical objects and causes them to fall toward the ground when dropped. The force of gravity between two objects depends on their masses and the distance between them, as described by Newton\'s law of universal gravitation. Einstein later refined this with general relativity, explaining gravity as the curvature of spacetime caused by mass and energy.' },
  { id: 'physics-quantum', topic: 'quantum mechanics', content: 'Quantum mechanics is the branch of physics that describes the behavior of matter and energy at the smallest scales — atoms and subatomic particles. Key principles include wave-particle duality (particles can behave as waves), the uncertainty principle (you cannot know both position and momentum precisely), and superposition (particles exist in multiple states until measured). Quantum entanglement allows particles to be correlated regardless of distance.' },
  { id: 'physics-blackholes', topic: 'black holes', content: 'A black hole is a region of spacetime where gravity is so strong that nothing, not even light, can escape once past the event horizon. They form when massive stars collapse at the end of their life cycle. The singularity at the center has infinite density. Black holes can be detected by their effect on nearby matter and by gravitational waves produced when two black holes merge. Hawking radiation suggests black holes slowly evaporate over immense timescales.' },
  { id: 'biology-evolution', topic: 'evolution', content: 'Evolution is the change in heritable characteristics of biological populations over successive generations. Natural selection, described by Charles Darwin, is the key mechanism: organisms with traits better suited to their environment are more likely to survive and reproduce. Over millions of years, this process has produced the diversity of life on Earth. Evidence comes from fossils, DNA comparisons, observed speciation, and vestigial structures.' },
  { id: 'biology-dna', topic: 'DNA', content: 'DNA (deoxyribonucleic acid) is the molecule that carries genetic instructions for life. It has a double helix structure made of nucleotide bases — adenine (A), thymine (T), guanine (G), and cytosine (C). The sequence of these bases encodes proteins that build and maintain organisms. DNA replication allows cells to divide with copies of genetic information. Mutations in DNA can lead to variations that drive evolution.' },
  { id: 'history-renaissance', topic: 'Renaissance', content: 'The Renaissance was a cultural movement spanning roughly the 14th to 17th century, beginning in Italy and spreading across Europe. It marked a renewed interest in classical Greek and Roman art, philosophy, and science. Key figures include Leonardo da Vinci, Michelangelo, Galileo, and Machiavelli. The Renaissance saw advances in art (perspective, realism), science (heliocentrism, anatomy), and political thought, and is considered the bridge between the Middle Ages and modern history.' },
  { id: 'philosophy-stoicism', topic: 'stoicism', content: 'Stoicism is an ancient Greek philosophy founded by Zeno of Citium around 300 BC. Core principles: virtue (wisdom, courage, justice, temperance) is the highest good; we cannot control external events but can control our responses; emotions arise from judgments we can examine and change. Key Stoic thinkers include Marcus Aurelius, Seneca, and Epictetus. Stoicism emphasizes living in accordance with nature and reason, accepting what we cannot change, and focusing on what we can.' },
  { id: 'philosophy-existentialism', topic: 'existentialism', content: 'Existentialism is a philosophical movement emphasizing individual existence, freedom, and choice. Key ideas: existence precedes essence (we define ourselves through actions, not inherent nature); radical freedom brings anxiety and responsibility; life has no inherent meaning, so we must create our own. Major existentialists include Kierkegaard, Nietzsche, Sartre, Camus, and de Beauvoir. Camus explored the absurd — the conflict between human desire for meaning and the universe\'s silence.' },
  { id: 'cs-algorithms', topic: 'algorithms', content: 'An algorithm is a step-by-step procedure for solving a problem or performing a computation. Key concepts: time complexity (Big O notation measures how runtime grows with input size), space complexity (memory usage), and common categories like sorting (quicksort, mergesort), searching (binary search), graph algorithms (Dijkstra, BFS, DFS), and dynamic programming. Algorithm design involves trade-offs between speed, memory, and simplicity.' },
  { id: 'cs-ai', topic: 'artificial intelligence', content: 'Artificial intelligence (AI) is the simulation of human intelligence by machines. Machine learning, a subset of AI, enables systems to learn from data without explicit programming. Deep learning uses neural networks with many layers to recognize patterns. Key milestones: chess (Deep Blue, 1997), image recognition (ImageNet, 2012), language models (GPT, 2018+), and game playing (AlphaGo, 2016). Current AI excels at narrow tasks but general AI remains an open challenge.' },
  { id: 'economics-supply-demand', topic: 'supply and demand', content: 'Supply and demand is the fundamental model of price determination in a market economy. Demand: as price decreases, quantity demanded increases (law of demand). Supply: as price increases, quantity supplied increases (law of supply). Equilibrium occurs where supply meets demand. Shifts in either curve (due to income, preferences, costs, technology) change equilibrium price and quantity. This model explains pricing for everything from groceries to housing.' },
  { id: 'psychology-cognitive-bias', topic: 'cognitive biases', content: 'Cognitive biases are systematic patterns of deviation from rationality in judgment. Common biases include: confirmation bias (favoring information that confirms existing beliefs), anchoring (over-relying on the first piece of information), availability heuristic (judging probability by how easily examples come to mind), Dunning-Kruger effect (low-ability individuals overestimate their competence), and loss aversion (losses feel roughly twice as painful as equivalent gains feel good).' },
];

export async function handleSeed(_request: Request, env: Env): Promise<Response> {
  const results: Array<{ id: string; status: string }> = [];

  // Process in batches of 4 (embedding API limit)
  for (let i = 0; i < SEED_ENTRIES.length; i += 4) {
    const batch = SEED_ENTRIES.slice(i, i + 4);

    // Generate embeddings
    const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: batch.map((e) => e.content),
    });

    // Upsert to Vectorize
    const vectors = batch.map((entry, j) => ({
      id: entry.id,
      values: (embeddingResult as { data: number[][] }).data[j],
      metadata: {
        topic: entry.topic,
        content: entry.content,
      },
    }));

    await env.VECTOR_INDEX.upsert(vectors);

    for (const entry of batch) {
      results.push({ id: entry.id, status: 'ok' });
    }
  }

  return Response.json({
    ok: true,
    seeded: results.length,
    entries: results,
  });
}
