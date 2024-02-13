import { Description } from "@mui/icons-material";
import { Service } from "../types/Service";

/* Static prop types legend (6/1/23)
seq [DUPLICATE]       : str*2
gene                  : str
design-primers        : str*4
rehydrate-primer      : str
pcr                   : bool*3, num*3, str
gel-electrophoresis   : dropdown, num*4, str
dpn1                  : bool
gibson-assembly       : bool, str*2          // PRODUCES DNA; SCREENING REQUIRED
restriction-digest    : bool, str
restriction-ligation  : bool, str
clean-up              : bool, num
dna-storage           : [ENUM?]
run-gel               : bool, str
column-purification   : bool, num
dna-gel               : bool
m-cloning             : bool*2, num, str*3   // PRODUCES DNA; SCREENING REQUIRED
transformation        : bool*2, dropdown, num*2, [dropdown or str?]
overnight-culture     : bool*2, num*5, [dropdown or str?]
miniprep-gs           : bool, num
glyc-storage          : [none]
eth-perc              : str
bioanalyzer           : str*2
mRNA-enrichment       : str
library-prep          : str
seq [DUPLICATE]       : str
cell-culture-induction: str
cell-lysate           : str
protein-production    : str
storage               : str
*/

/* Static allowed connections legend (6/1/23)
seq                   : gene, storage, design-primers
gene                  : design-primers
design-primers        : rehydrate-primer
rehydrate-primer      : pcr
pcr                   : run-gel, dpn1, gel-electrophoresis
gel-electrophoresis   : column-purification, mutagenesis, inverse-pcr, pcr, qpcr, colony-pcr, temperature-gradient-test, colony-pcr, gibson-assembly
dpn1                  : run-gel, column-purification
gibson-assembly       : transformation, ordering-dna-fragments, dna-storage, mutagenesis, mutagenesis-by-inverse-pcr, temperature-gradient-test,
restriction-digest    : clean-up, dna-storage, gel-electrodsgfasd, restriction-ligation
restriction-ligation  : transformation, ordering-dna-fragment, dna-storage, restriction-digest
clean-up              : [need to add allowed connections]
dna-storage           : [need to add allowed connections]
run-gel               : column-purification
column-purification   : assembly, dna-gel
dna-gel               : dna-storage, gel-electrophoresis
m-cloning             : transformation
transformation        : overnight-culture, plate-storage, overnight-culture
overnight-culture     : miniprep, storage, miniprep-gs
miniprep-gs           : storage, seq
glyc-storage          : [none?]
eth-perc              : bioanalyzer, rna-extraction, gel
bioanalyzer           : library-prep, seq, eth-perc
mRNA-enrichment       : rna-extraction, library-prep, bioanalyzer
library-prep          : seq, mRNA-enrichment, bioanalyzer
seq                   : bioanalyzer
cell-culture-induction: plate-reader, storage, flow-cytometry,
cell-lysate           : plate-reader, storage, cell-culture-induction,
protein-production    : plate-reader, storage, cell-lysate, cell-culture-induction
storage               : overnight-culture
*/

export let services: Service[] = [
    {
        id: 'seq',
        name: 'Send Sample to Sequencing',
        // icon: 'https://drive.google.com/uc?id=1KwchGg3_H3REm_jv5vf6IIUDmTupIPVs',
        icon: 'https://drive.google.com/thumbnail?id=15LMIjlt73eu-wI5VfTJcXEybfuWRm8bd',
        // Name of item, type (plasmid, purified PCR, unpurified PCR, cosmid, BAC, Genomic DNA, Colony, RCA), size (kb), concentration (ng/ul), premixed? (yes/no), sequencing primer (with name), concentration of sequencing primer (uM)
        parameters: [
            {
                id: 'sample',
                name: 'Sample Type',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'plasmid',
                name: 'Plasmid Name',
                type: 'string',
                paramType: 'flow',
                flowId: 'plasmid-flow',
                required: true
            }
        ],

        allowedConnections: [
            'gene', 'storage', 'design-primers'
        ],
        categories: ['dna-rna'],
        // need to think about to capture result that comes from a file they send
        result: null,
    },
    {
        id: 'gene',
        name: 'Order Gene Fragment',
        // icon: 'https://drive.google.com/uc?id=1Zj4BohScCf6NNgebjrzDazseNSGN4CI9',
        icon: 'https://drive.google.com/thumbnail?id=1rhLeDV-7egQjsgrAcGBxzRhCqNkZNIxK',
        parameters: [
            {
                id: 'fragment-sequence',
                name: 'Fragment Sequence',
                type: 'string',
                paramType: 'input',
                required: true
            },
        ],
        allowedConnections: [
            'design-primers',
        ],
        categories: ['dna-assembly-cloning'],
        result: {
            id: 'gene-fragment-result',
            type: 'GeneFragmentResult',
            text: 'DNA suspended in solution to standard concentration'
        }
    },
    {
        id: 'design-primers',
        name: 'Design and Order Primers',
        icon: 'https://cdn-icons-png.flaticon.com/512/1087/1087532.png',
        parameters: [
            {
                id: 'target-gene',
                name: 'Target Gene',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'forward-primer',
                name: 'Forward Primer',
                type: 'string',
                paramType: 'flow',
                flowId: 'forward-primer-flow',
                required: true
            },
            {
                id: 'reverse-primer',
                name: 'Reverse Primer',
                type: 'string',
                flowId: 'reverse-primer-flow',
                paramType: 'flow',
                required: true

            },
            {
                id: 'sequencing-primer',
                name: 'Sequencing Primer',
                type: 'string',
                paramType: 'input',
                required: true
            }
        ],
        categories: ['dna-assembly-cloning'],
        allowedConnections: [
            'rehydrate-primer'
        ],
        result: null
    },
    {
        id: 'rehydrate-primer',
        name: 'Rehydrate Primers',
        // icon: 'https://drive.google.com/uc?id=1r3Jk3Y1P-YMmp1CNryY0-5nFCIYLc7Wy',
        icon: 'https://drive.google.com/thumbnail?id=14s7ceqCUIrQpJF4dzO62fAq3T4KrDqd7',
        parameters: [
            {
                id: 'buffer',
                name: 'Buffer',
                type: 'string',
                paramType: 'input',
                required: true
            },
        ],
        allowedConnections: [
            'pcr'
        ],
        categories: ['dna-assembly-cloning'],
        result: null,
    },
    {
        id: 'pcr',
        name: 'PCR',
        // icon: 'https://drive.google.com/uc?id=1WV97Xgtp-ZngdSS1A-f8Vk9lP2LAuOpt',
        icon: 'https://drive.google.com/thumbnail?id=13yRKvw2299FCjbxxfSwyIhJxinB0SbpM',
        description: 'Polymerase chain reaction (abbreviated PCR) is a laboratory technique for rapidly producing (amplifying) millions to billions of copies of a specific segment of DNA, which can then be studied in greater detail. PCR involves using short synthetic DNA fragments called primers to select a segment of the genome to be amplified, and then multiple rounds of DNA synthesis to amplify that segment.',
        parameters: [
            {
                id: 'melting-temp',
                name: 'Melting Temperature',
                type: 'number',
                paramType: 'input',
                required: true
            },
            {
                id: 'cycle-time',
                name: 'Cycle Time',
                type: 'number',
                paramType: 'input',
                required: true
            },
            {
                id: 'reaction-volume',
                name: 'Reaction Volume',
                type: 'number',
                paramType: 'input',
                required: true
            },
            {
                id: 'forward-primer',
                name: 'Forward Primer',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'reverse-primer',
                name: 'Reverse Primer',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'template-dna',
                name: 'Template DNA',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'polymerase',
                name: 'Polymerase',
                type: 'string',
                paramType: 'input',
                required: true
            }
        ],
        allowedConnections: [
            'run-gel', 'dpn1', 'gel-electrophoresis'
        ],
        categories: ['dna-assembly-cloning'],
        result: {
            id: 'pcr-product',
            type: 'PCRResult',
            result: {
                id: 'pcr-result',
                amount: 'number', // this will be equal to reaction volume number
            }
        }
    },
    {
        id: 'gel-electrophoresis',
        name: 'Gel Electrophoresis',
        description: 'Gel electrophoresis is a laboratory method used to separate mixtures of DNA, RNA, or proteins according to molecular size. In gel electrophoresis, the molecules to be separated are pushed by an electrical field through a gel that contains small pores.',
        // icon: 'https://drive.google.com/uc?id=1lIq60MG4kdCmu4iJrNZikAc60TUlta5M', // find real icon
        icon: 'https://drive.google.com/thumbnail?id=1QzCvaWYcw7hwXhxjDbcYcbIvvft6sqv8',
        parameters: [
            {
                id: 'gel-type',
                name: 'Gel Percentage',
                description: 'Provide a number between 0.5% and 3.0%',
                type: 'number',
                paramType: 'input',
                required: false
            },
            {
                id: 'sample-length',
                name: 'Sample Length',
                description: 'Numbers and base pairs 50bp - 10000bp',
                type: 'number',
                paramType: 'input',
                required: true
            },
            {
                id: 'ladder',
                name: 'Ladder',
                description: 'select from dropdown',
                options: [
                    {
                        id: '100-bp-ladder',
                        name: '100 bp ladder'
                    }, {
                        id: '1-kb-ladder',
                        name: '1 kb ladder'
                    },
                    {
                        id: '1-kb-plus-ladder',
                        name: '1 kb plus ladder'
                    }
                ],
                type: 'dropdown',
                paramType: 'input',
                required: true
            },
            {
                id: 'dye',
                name: 'Dye',
                description: 'autofill SYBR Safe',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'voltage',
                name: 'Voltage',
                description: 'Numbers and volts 50 - 200',
                type: 'number',
                paramType: 'input',
                required: false
            },
            {
                id: 'time',
                name: 'Time',
                description: 'Provide minutes 10 - 60',
                type: 'number',
                paramType: 'input',
                required: false
            }
        ],
        // allowed connections : purified dna from agrose gel extraction, mutagenesis, mutagensis by inverse pcr, perform pcr reaction, perform qpcr reaction, colony pcr,temperatue gradient test, colony PCR
        allowedConnections: [
            'column-purification', 'mutagenesis', 'inverse-pcr', 'pcr', 'qpcr', 'colony-pcr', 'temperature-gradient-test', 'colony-pcr', 'gibson-assembly'
        ],
    },
    {
        id: 'dpn1',
        name: 'Digest with Dpn1',
        icon: 'https://cdn-icons-png.flaticon.com/512/647/647370.png',
        resultParams: ['pcr-product'],
        parameters: [
            {
                id: 'pcr-product-param',
                name: 'PCR Product Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            }
        ],
        allowedConnections: [
            'run-gel', 'column-purification'
        ],
        result: {
            id: 'dpn1-product',
            type: 'Dpn1Result',
            result: {
                id: 'dpn1-result',
                amount: 'number', // pcr result - gel amount
            }
        },
        categories: ['dna-assembly-cloning'],
    },
    {
        id: 'gibson-assembly',  // PRODUCES DNA; SCREENING REQUIRED
        name: 'Gibson Assembly',
        // icon: 'https://drive.google.com/thumbnail?id=1pld9hXCDV9u1MSkMbUBXg4mtvBwMpS1I',
        // icon: 'https://raw.githubusercontent.com/hicsail/damplab-ui/691ace7a9955f4539add30fe641a3dcc82cba31a/public/gibson-assembly.svg',
        icon: 'https://drive.google.com/thumbnail?id=1S9H5ydQhe9jyFmRtz09yExg4a8j36-Mp',
        description: 'Gibson Assembly is a method of joining double-stranded DNA fragments in vitro. It is a rapid, reliable, and scarless method of DNA assembly that can be used to join both sticky and blunt ends, and can be used to assemble multiple DNA fragments simultaneously.',
        parameters: [
            {
                id: 'template-dna',
                name: 'Template DNA',
                type: 'boolean',
                description: 'result param from pcr',
                paramType: 'result',
                required: true
            },
            {
                id: 'master-mix',
                name: 'Master Mix',
                type: 'string',
                paramType: 'input',
                required: false
            },
            {
                id: 'enzyme',
                name: 'Enzyme',
                type: 'string',
                paramType: 'input',
                required: false
            },
            {
                id: 'gibson-insert',
                name: 'Gibson Insert',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'gibson-vector',
                name: 'Gibson Vector',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'gibson-restriction-site-first',
                name: 'Gibsons First Restriction Site',
                description: '',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'gibson-restriction-site-second',
                name: 'Gibsons Second Restriction Site',
                description: '',
                type: 'string',
                paramType: 'input',
                required: true
            },
        ],
        allowedConnections: [
            'transformation', 'ordering-dna-fragments', 'dna-storage', 'mutagenesis', 'mutagenesis-by-inverse-pcr',
            'temperature-gradient-test',
        ],
    },
    {
        id: 'restriction-digest',
        name: 'Restriction Digest',
        icon: 'https://cdn-icons-png.flaticon.com/512/647/647370.png', // go find it
        parameters: [
            {
                id: 'template-dna',
                name: 'Template DNA',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'restriction-enzyme',
                name: 'Restriction Enzyme',
                type: 'string',
                paramType: 'input',
                required: true
            }
        ],
        allowedConnections: [
            'clean-up', 'dna-storage', 'gel-electrodsgfasd', 'restriction-ligation'
        ],
    },
    {
        id: 'restriction-ligation',
        name: 'Restriction Ligation',
        icon: 'https://cdn-icons-png.flaticon.com/512/647/647370.png', // go find it
        parameters: [
            {
                id: 'digest-dna',
                name: 'Digest DNA',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'dna-ligase',
                name: 'DNA Ligase',
                type: 'string',
                paramType: 'input',
                required: true
            }
        ],
        allowedConnections: [
            'transformation', 'ordering-dna-fragment', 'dna-storage', 'restriction-digest'
        ],
    },
    {
        id: 'clean-up',
        name: 'Clean Up and Concentrate DNA',
        icon: 'https://cdn-icons-png.flaticon.com/512/647/647370.png', // go find it
        parameters: [
            {
                id: 'template-dna',
                name: 'Template DNA',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'concentration',
                name: 'Concentration',
                type: 'number',
                paramType: 'input',
                required: true
            },
        ],
        // add allowed connections
    },
    {
        id: 'dna-storage',
        name: 'Plasmid, DNA fragment, or oligo storage',
        icon: 'https://cdn-icons-png.flaticon.com/512/647/647370.png', // go find it
        parameters: [
            {
                id: 'dna-types',
                name: 'Type',
                type: 'ENUM',
                paramType: 'input',
                required: true
            },
        ],
        categories: ['dna-assembly-cloning']
        // add allowed connections

    },
    {
        id: 'run-gel',
        name: 'Run Agarose Gel',
        icon: 'https://cdn-icons-png.flaticon.com/512/2222/2222661.png',
        resultParams: ['pcr-product'],
        parameters: [
            {
                id: 'ladder',
                name: 'Ladder',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'pcr-product-param',
                name: 'PCR Product Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            }
        ],
        allowedConnections: [
            'column-purification'
        ],
        categories: ['dna-rna'],
        result: {
            id: 'gel-product',
            type: 'GelResult',
        }
    },
    {
        id: 'column-purification',
        name: 'Column Purification',
        icon: 'https://cdn-icons-png.flaticon.com/512/4192/4192130.png',
        resultParams: ['dpn1-product'],
        parameters: [
            {
                id: 'desired-concentration',
                name: 'Desired Concentration',
                type: 'number',
                paramType: 'input',
                required: true
            },
            {
                id: 'dpn1-product-param',
                name: 'Dpn1 Product Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            }
        ],
        allowedConnections: [
            'assembly', 'dna-gel'
        ],
        categories: ['dna-rna']
    },
    {
        id: 'dna-gel',
        name: 'Purify DNA from Agarose Gel Extraction',
        icon: 'https://cdn-icons-png.flaticon.com/512/3182/3182554.png',
        resultParams: ['gel-product'],
        parameters: [
            {
                id: 'gel-product-param',
                name: 'Gel Product Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            }
        ],
        allowedConnections: [
            'dna-storage', 'gel-electrophoresis'
        ],
        categories: ['dna-rna']
    },
    {
        id: 'm-cloning',  // PRODUCES DNA; SCREENING REQUIRED
        name: 'Modular Cloning',
        icon: 'https://cdn-icons-png.flaticon.com/512/1974/1974478.png',
        // icon: 'https://github.com/hicsail/damplab-ui/blob/biosecurity-basics/public/modular-cloning.png?raw=true',
        resultParams: [
            'forward-primer-flow', 'reverse-primer-flow',
        ],
        parameters: [
            {
                id: 'antibiotic',
                name: 'Antibiotic',
                type: 'string',
                workflowId: 'antibiotic-workflow',
                paramType: 'flow',
                required: true
            },
            {
                id: 'buffer',
                name: 'Buffer',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'desired-concentration',
                name: 'Desired Concentration',
                type: 'number',
                paramType: 'input',
                required: true
            },
            {
                id: 'ladder',
                name: 'Ladder',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'forward-primer-flow-param',
                name: 'Forward Primer Flow Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'reverse-primer-flow-param',
                name: 'Reverse Primer Flow Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'moclo-vector',
                name: 'MoClo Vector',
                description: '',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'moclo-insert',
                name: 'MoClo Insert',
                description: '',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'moclo-restriction-site-first',
                name: 'MoClo First Restriction Site',
                description: '',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'moclo-restriction-site-second',
                name: 'MoClo Second Restriction Site',
                description: '',
                type: 'string',
                paramType: 'input',
                required: true
            },
        ],
        allowedConnections: [
            'transformation'
        ],
        categories: ['fluorescence-based-assays'],
        result: {
            id: 'm-cloning-product',
            type: 'MCloningResult',
        }
    },
    {
        id: 'transformation',
        name: 'Transformation',
        // icon: 'https://drive.google.com/uc?id=1JRRNNrprfVjobLCnNRUUvCcRiJ0TkVI0',
        icon: 'https://drive.google.com/thumbnail?id=1KGDyxffZiehRFKSaPwaZWFjixXHrA84P',
        description: 'Transform cells with DNA',
        resultParams: ['m-cloning-product', 'antibiotic-workflow'],
        parameters: [
            {
                id: 'm-cloning-product-param',
                name: 'MCloning Product Result',
                description: 'Result from Gibson Assembly',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'antibiotic-workflow-product-param',
                name: 'Antibiotic Workflow Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'competent-cells',
                name: 'Competent Cells',
                type: 'dropdown',
                paramType: 'input',
                required: true,
                description: 'select from dropdown defauly is DH5alpha',
                options : [
                    {
                        id: 'DH5alpha',
                        name: 'DH5alpha'
                    },
                    {
                        id: 'DH10B',
                        name: 'DH10B'
                    },
                    {
                        id: 'e-coli',
                        name: 'E-coli'
                    }
                ]

            },
            {
                id: 'recovery-media',
                name: 'Recovery Media',
                type: 'string',
                paramType: 'input',
                required: true,
                description: 'select from dropdown default is SOC',
                // <- other option is LBE <- capture amount as well default is 10x reaction volume 198mL, range is 50-900'
                options : [
                    {
                        id: 'SOC',
                        name: 'SOC'
                    },
                    {
                        id: 'LBE',
                        name: 'LBE'
                    },
                    {
                        id: 'TB',
                        name: 'TB'
                    },
                ]
            },
            {
                id: 'recovery-time',
                name: 'Recovery Time',
                type: 'number',
                paramType: 'input',
                required: true,
                description: 'default is 1 hour, range is 0.5 - 2 hours'
            },
            {
                id: 'recovery-incubation-temp',
                name: 'Recovery Incubation Temperature',
                type: 'number',
                paramType: 'input',
                required: true,
                description: 'default is 37 degrees C and 250RPM, range is 30 - 42 degrees C'
            }
        ],
        allowedConnections: [
            'overnight-culture', 'plate-storage', 'overnight-culture'
        ],
        categories: ['fluorescence-based-assays'],
        result: {
            id: 'transformation-product',
            type: 'TransformationResult',
        }
    },
    {
        id: 'overnight-culture',
        name: 'Overnight Inoculum',
        // icon: 'https://drive.google.com/uc?id=1Wckp8P3GwvJw-7_tb1DevtSVCFPaevcG',
        icon: 'https://drive.google.com/thumbnail?id=1XOCFkGHslF5T5EEOHygIR9YaKBKkMoYp',
        description: 'Grow cells overnight',
        resultParams: ['transformation-product', 'antibiotic-workflow'],
        parameters: [
            {
                id: 'desired-volume',
                name: 'Desired Volume',
                type: 'number',
                paramType: 'input',
                required: true
            },
            {
                id: 'transformation-product-param',
                name: 'Transformation Product Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'antibiotic-workflow-product-param',
                name: 'Antibiotic Workflow Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
            {
                id: 'growth-media',
                name: 'Growth Media',
                type: 'string',
                paramType: 'input',
                required: true,
                description: 'select from dropdown',
                // default is LBE <- other option is SOC or TB or M9 <- capture amount as well default is 10x reaction volume 198mL, range is 50-900
                options : [
                    {
                        id: 'LBE',
                        name: 'LBE'
                    },
                    {
                        id: 'SOC',
                        name: 'SOC'
                    },
                    {
                        id: 'TB',
                        name: 'TB'
                    },
                    {
                        id: 'M9',
                        name: 'M9'
                    }
                ],
            },
            {
                id: 'growth-tilt',
                name: 'Growth Tilt',
                type: 'number',
                paramType: 'input',
                required: true,
                description: '0-45 degrees'
            },
            {
                id: 'rpm',
                name: 'RPM',
                type: 'number',
                paramType: 'input',
                required: true,
                description: 'default is 250RPM, range is 50-300'
            },
            {
                id: 'growth-temp',
                name: 'Growth Temperature',
                type: 'number',
                paramType: 'input',
                required: true,
                description: 'default is 37 degrees C, range is 30 - 42 degrees C'
            },
            {
                id: 'growth-time',
                name: 'Growth Time',
                type: 'number',
                paramType: 'input',
                required: true,
                description: 'default is 16 hours, range is 10 - 48 hours'
            }
        ],
        allowedConnections: [
            'miniprep',
            'storage',
            'miniprep-gs'
        ],
        categories: ['culturing-media'],
        result: {
            id: 'overnight-culture-product',
            type: 'OvernightCultureResult',
        }
    },
    {
        id: 'miniprep-gs',
        name: 'Miniprep and Glycerol Stock',
        // icon: 'https://drive.google.com/uc?id=1Lam_nDy2e5CwjAK_TU6L1zPAEAeZGRqw',
        icon: 'https://drive.google.com/thumbnail?id=1P1kSBdfCJ-ewj_st9ZusnNmSyWQMFG_7',
        description: 'We use thermofisher, no charge spin switch',
        resultParams: ['overnight-culture-product'],
        parameters: [
            {
                id: 'desired-concentration',
                name: 'Desired Concentration',
                type: 'number',
                paramType: 'input',
                required: false
            },
            {
                id: 'overnight-culture-product-param',
                name: 'Overnight Culture Product Result',
                type: 'boolean',
                paramType: 'result',
                required: true
            },
        ],
        categories: ['dna-rna'],
        allowedConnections: [
            'storage', 'seq'
        ],
        result: {
            id: 'miniprep-gs-product',
            type: 'MiniprepGSResult',
        }
    },
    {
        id: 'glyc-storage',
        name: 'Glycerol Stock Storage',
        icon: 'https://cdn-icons-png.flaticon.com/512/4352/4352975.png',
        categories: ['pcr-reactions'],
        parameters: [],
        result: {
            id: 'glyc-storage-product',
            type: 'GlycStorageResult',
            name: 'Glycerol Stock Storage Result',
        }
    },
    {
        id: 'eth-perc',
        name: 'DNA/RNA Ethanol Precipitation',
        // icon: 'https://drive.google.com/uc?id=1Gdv5OByXeIQET13AowTdKAEKrC-687TH',
        icon: 'https://drive.google.com/thumbnail?id=1JQ8VUAGGOZa9-dROZfS_thEHcNLvKB7L',
        categories: ['dna-rna'],
        allowedConnections: [
            'bioanalyzer', 'rna-extraction', 'gel'
        ],
        parameters: [
            {
                id: 'pcr-product-param',
                name: 'PCR Product Result',
                type: 'string',
                paramType: 'input',
                required: true
            },
        ],
        result: {
            id: 'eth-perc-product',
            type: 'EthPercResult',
            name: 'Ethanol Precipitation Result',
        }
    },
    {
        id: 'bioanalyzer',
        name: 'Bioanalyzer',
        // icon: 'https://drive.google.com/uc?id=1L2wX2D0Vhlq6UpU3VnA4FGKaDq259LXk',
        icon: 'https://drive.google.com/thumbnail?id=1wiL_-GBWMi7M5hty9CWcf4mbmJhW4k8E',
        categories: ['transcriptomics'],
        allowedConnections: [
            'library-prep', 'seq', 'eth-perc'
        ],
        parameters: [
            {
                id: 'eth-perc-product',
                name: 'Ethanol Precipitation Result',
                type: 'string',
                paramType: 'input',
                required: true
            },
            {
                id: 'control',
                name: 'Control Type',
                type: 'string',
                paramType: 'input',
                required: true
            }
        ],
        result: {
            id: 'bioanalyzer-product',
            type: 'BioanalyzerResult',
            name: 'Bioanalyzer Result',
        }
    },
    {
        id: 'mRNA-enrichment',
        name: 'mRNA Enrichment',
        // icon: 'https://drive.google.com/uc?id=15Dg7u9OWhZjVQ8lGYszIYDo7FcTQkkOW',
        icon: 'https://drive.google.com/thumbnail?id=1l4AoRs0ieidpFy566BFmOmUOJnIcT5hj',
        categories: ['transcriptomics'],
        allowedConnections: [
            'rna-extraction', 'library-prep', 'bioanalyzer'
        ],
        parameters: [
            {
                id: 'bioanalyzer-product',
                name: 'Bioanalyzer Result',
                type: 'string',
                paramType: 'result',
                required: true
            },
        ],
        result: {
            id: 'mRNA-enrichment-product',
            type: 'MRnaEnrichmentResult',
            name: 'mRNA Enrichment Result',
        }
    },
    {
        id: 'library-prep',
        name: 'Library Prep',
        // icon: 'https://drive.google.com/uc?id=1aQ-sXASGWS_ZjBR-ROIdlsbg7mhg2Yk7',
        icon: 'https://drive.google.com/thumbnail?id=1qhvrFaX_Ujq3fUAzKP-HgNX3fqSC7jmT',
        categories: ['transcriptomics'],
        allowedConnections: [
            'seq', 'mRNA-enrichment', 'bioanalyzer'
        ],
        parameters: [
            {
                id: 'mRNA-enrichment-product',
                name: 'mRNA Enrichment Result',
                type: 'string',
                paramType: 'result',
                required: true
            },
        ],
        result: {
            id: 'library-prep-product',
            type: 'LibraryPrepResult',
            name: 'Library Prep Result',
        }
    },
    {
        id: 'seq',
        name: 'NGS Sequencing',
        // icon: 'https://drive.google.com/uc?id=1oiZLiBOUJqFPI_46_YCtk9mrYNkkfFLL',
        icon: 'https://drive.google.com/thumbnail?id=1_t3YCiglSyjYzdJMLgOSUex9eu0sM2Se',
        categories: ['transcriptomics'],
        allowedConnections: [
            'bioanalyzer'
        ],
        parameters: [
            {
                id: 'library-prep-product',
                name: 'Library Prep Result',
                type: 'string',
                paramType: 'result',
                required: true
            },

            // add more
        ],
        result: {
            id: 'seq-product',
            type: 'SeqResult',
            name: 'NGS Sequencing Result',
        }
    },
    {
        id: 'cell-culture-induction',
        name: 'Cell Culture Induction and Selection',
        // icon: 'https://drive.google.com/uc?id=1f7fX9OQzpzq6q66p6Rn-ednSCQysE14o', // Cell Culture.svg
        icon: 'https://drive.google.com/thumbnail?id=1IgSzmw5D4RpweYeWl0jnLCw5XWqOgCcp',
        categories: ['culturing-media'],
        allowedConnections: [
            'plate-reader',
            'storage',
            'flow-cytometry',
        ],
        parameters: [
            {
                id: 'induction-culture',
                name: 'Overnight Bacterial Culture',
                type: 'string',
                paramType: 'input',
                required: true
            },
        ],
        result: {
            id: 'induced-sample',
            type: 'InducedSampleResult',
            name: 'Induced Bacterial Culture Result',
        }
    },
    {
        id: 'cell-lysate',
        name: 'Cell Lysate Production',
        // icon: 'https://drive.google.com/uc?id=13aVzjB_unTVcr-3GsNLJeEDy63LE-yZ4', // Cell Lysate Production.svg
        icon: 'https://drive.google.com/thumbnail?id=1cym6zJ4AwCNtES8KCrTdj2PvCTuqdwmX',
        categories: ['culturing-media'],
        allowedConnections: [
            'plate-reader',
            'storage',
            'cell-culture-induction',
        ],
        parameters: [
            {
                id: 'lysate-bacterial-culture',
                name: 'Large Volume Bacterial Culture',
                type: 'string',
                paramType: 'input',
                required: true
            },
        ],
        result: {
            id: 'cell-lysate-product',
            type: 'CellLysateResult',
            name: 'Cell Lysate Result',
        }
    },
    {
        id: 'protein-production',
        name: 'Protein Production and Purification from Cell Lysate',
        // icon: 'https://drive.google.com/uc?id=1r0uMBqqugBe-KqkdZacY5w1RqyL5ijh5', // Protein Production.svg
        icon: 'https://drive.google.com/thumbnail?id=1joahDEPtnzTGs5wGOMu2TNc32ld9J0WL',
        categories: ['culturing-media'],
        allowedConnections: [
            'plate-reader',
            'storage',
            'cell-lysate',
            'cell-culture-induction'
        ],
        parameters: [
            {
                id: "protein-bacterial-culture",
                name: 'Large Volume Bacterial Culture',
                type: 'string',
                paramType: 'input',
                required: true
            },
        ],
        result: {
            id: 'lysate-protein',
            type: 'LysateProteinResult',
            name: 'Cell Lysate Containing Protein',
        }
    },
    {
        id: 'storage',
        name: "Overnight Innoculums of Bacteria Cell Culture Storage",
        // icon: 'https://drive.google.com/uc?id=1DfUSEFooEi-C4FPUD6Snu-c-tPLzppwp', // Storage Bacteria.svg
        icon: 'https://drive.google.com/thumbnail?id=1XOCFkGHslF5T5EEOHygIR9YaKBKkMoYp',
        categories: ['storage'],
        allowedConnections: [
            'overnight-culture',
        ],
        parameters: [
            {
                id: 'overnight-culture',
                name: 'Overnight Bacterial Culture',
                type: 'string',
                paramType: 'result',
                required: true
            },
        ],
        result: {
            id: 'overnight-culture-storage',
            type: 'OvernightCultureStorageResult',
            name: 'Overnight Bacterial Culture Storage Result',
        }
    }
];