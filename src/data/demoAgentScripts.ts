import { AgentWorkflowSpec } from '../controllers/AgentWorkflowHydration';

/**
 * Scripted Canvas Assistant exchange for recorded demos. When the user sends
 * `prompt` (via the suggestion button in the intro message, or by typing it),
 * the chat skips the backend agent, "thinks", streams `reply`, and fills the
 * canvas with the bundle below. Nothing here touches the real agent path.
 */
export interface DemoAgentScript {
  prompt: string;
  reply: string;
  /** Bundle whose ordered steps become the workflow (looked up by label). */
  bundleLabel: string;
  /** Used when the bundle isn't in the catalog: steps by service name, in order. */
  fallbackServiceNames: string[];
  /**
   * Stock values per service name, keyed by parameter id. Dropdown values are
   * given as the option *name* and resolved to the option id at apply time.
   */
  parameters: Record<string, Record<string, any>>;
}

export const GIBSON_DEMO: DemoAgentScript = {
  prompt:
    'Set up a Gibson Assembly workflow to clone an ordered sfGFP gene fragment into pUC19, with recommended parameters.',
  reply: [
    "Here's a Gibson Assembly and Cloning workflow built from the lab's standard bundle, with recommended settings filled in:",
    '',
    '1. **Order the sfGFP fragment** (717 bp) with 25 bp homology arms matching pUC19',
    '2. **Design and order primers** to amplify the insert, then **rehydrate** them in IDTE',
    '3. **PCR**, then check the ~750 bp product on a **1% gel** with a 1 kb plus ladder',
    '4. **Extract and purify** the band from the gel (30 µL elution)',
    '5. **Gibson Assembly** with NEBuilder HiFi master mix, 50 °C for 60 min',
    '6. **Glycerol stocks** at −80 °C and **whole-plasmid sequencing** to verify the construct',
    '',
    "To finish, upload your **vector** and **full plasmid map** on the Gibson Assembly step. Adjust any values before checkout.",
  ].join('\n'),
  bundleLabel: 'Gibson Assembly and Cloning with Ordering',
  fallbackServiceNames: [
    'Ordering DNA Fragments from third-party',
    'Design and Order Primers from Third Party',
    'Rehydrate and Suspend Primers in Solution',
    'Perform PCR Reaction',
    'Gel Electrophoresis with Analysis',
    'DNA Extraction',
    'Purify DNA from Agarose Gel Extraction',
    'Gibson Assembly',
    'Glycerol Stocks Storage',
    'Send Sample for sequencing',
  ],
  parameters: {
    'Ordering DNA Fragments from third-party': {
      'fragment-sequence':
        'ATGAGCAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGGTGATGTTAATGGGCACAAATTTTCTGTCCGTGGAGAGGGTGAAGGTGATGCTACAAACGGAAAACTCACCCTTAAATTTATTTGCACTACTGGAAAACTACCTGTTCCGTGGCCAACACTTGTCACTACTCTGACCTATGGTGTTCAATGCTTTTCCCGTTATCCGGATCACATGAAACGGCATGACTTTTTCAAGAGTGCCATGCCCGAAGGTTATGTACAGGAACGCACTATATCTTTCAAAGATGACGGGACCTACAAGACGCGTGCTGAAGTCAAGTTTGAAGGTGATACCCTTGTTAATCGTATCGAGTTAAAAGGTATTGATTTTAAAGAAGATGGAAACATTCTTGGACACAAACTCGAGTACAACTTTAACTCACACAATGTATACATCACGGCAGACAAACAAAAGAATGGAATCAAAGCTAACTTCAAAATTCGCCACAACGTTGAAGATGGTTCCGTTCAACTAGCAGACCATTATCAACAAAATACTCCAATTGGCGATGGCCCTGTCCTTTTACCAGACAACCATTACCTGTCGACACAATCTGTCCTTTCGAAAGATCCCAACGAAAAGCGTGACCACATGGTCCTTCTTGAGTTTGTAACTGCTGCTGGGATTACACATGGCATGGATGAGCTCTACAAATAA',
      'additional-notes': 'sfGFP CDS with 25 bp 5′/3′ homology arms to pUC19 (EcoRI/HindIII-linearized).',
    },
    'Design and Order Primers from Third Party': {
      'target-gene': 'sfGFP',
      'forward-primer': 'ATGAGCAAAGGAGAAGAACTTTTCAC',
      'reverse-primer': 'TTATTTGTAGAGCTCATCCATGCCATG',
      'sequencing-primer': 'M13F (-20)',
    },
    'Rehydrate and Suspend Primers in Solution': {
      buffer: 'IDTE',
      number_of_samples: 2,
    },
    'Perform PCR Reaction': {
      'sample-number': 2,
      controls: 'Negative only',
      'supplied-volume': 25,
      buffer: 'Nuclease Free Water',
    },
    'Gel Electrophoresis with Analysis': {
      'gel-type': 1,
      'sample-length': 750,
      ladder: '1 kb plus ladder',
      voltage: 120,
      time: 30,
      number_of_samples: 2,
    },
    'DNA Extraction': {
      // This parameter's id is `additional-notes` but it is labelled "Number of samples".
      'additional-notes': 2,
      elution_buffer_volume: 30,
    },
    'Purify DNA from Agarose Gel Extraction': {
      'gel-product-param': true,
      elution_buffer_volume: 30,
      sample_bp_size: 750,
      number_of_samples: 2,
    },
    'Gibson Assembly': {
      'incubation-time': 60,
      'incubation-temp': 50,
      insert: 'sfGFP (717 bp) with 25 bp homology arms',
      'master-mix': 'NEBuilder HiFi DNA Assembly Master Mix',
    },
    'Glycerol Stocks Storage': {
      'additional-notes': '-80°C',
      'number_of_tubes/plates_to_be_stored': 2,
    },
    'Send Sample for sequencing': {
      'seq-type': 'Whole plasmid',
      plasmid: 'pUC19-sfGFP',
      number_of_samples: 2,
    },
  },
};

export const DEMO_AGENT_SCRIPTS: DemoAgentScript[] = [GIBSON_DEMO];

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Loose service-name key, so catalog edits like "w/" -> "with" don't drop the stock values. */
const serviceKey = (name: string) =>
  String(name || '').toLowerCase().replace(/\bw\//g, 'with ').replace(/[^a-z0-9]+/g, '');

export function findDemoScript(message: string): DemoAgentScript | undefined {
  const m = normalize(message || '');
  return DEMO_AGENT_SCRIPTS.find((s) => normalize(s.prompt) === m);
}

/** Resolve a script into an agent workflow spec against the live catalog. */
export function buildDemoWorkflowSpec(
  script: DemoAgentScript,
  services: any[],
  bundles: any[]
): AgentWorkflowSpec {
  const byId = new Map(services.map((s: any) => [String(s.id), s]));
  const byName = new Map(services.map((s: any) => [serviceKey(s.name), s]));
  const stockByName = new Map(Object.entries(script.parameters).map(([name, v]) => [serviceKey(name), v]));

  const bundle = bundles.find((b: any) => b?.label === script.bundleLabel);
  const bundleSteps: any[] = (bundle?.services ?? [])
    .map((ref: any) => byId.get(String(typeof ref === 'string' ? ref : ref?.id)))
    .filter(Boolean);
  const steps = bundleSteps.length > 0
    ? bundleSteps
    : script.fallbackServiceNames.map((n) => byName.get(serviceKey(n))).filter(Boolean);

  const nodes = steps.map((service: any) => {
    const stock = stockByName.get(serviceKey(service.name)) ?? {};
    const parameters: Record<string, any> = {};
    for (const [paramId, value] of Object.entries(stock)) {
      const def = (service.parameters ?? []).find((p: any) => p.id === paramId);
      if (!def) continue;
      if (def.type === 'dropdown' && Array.isArray(def.options)) {
        const opt = def.options.find((o: any) => o?.name === value || o?.id === value);
        if (opt) parameters[paramId] = opt.id;
      } else {
        parameters[paramId] = value;
      }
    }
    return { serviceId: String(service.id), serviceName: service.name, parameters };
  });

  const edges = nodes.slice(1).map((_, i) => ({ from: i, to: i + 1 }));
  return { nodes, edges };
}
