export let services = [
    {
        id: 'seq',
        name: 'Send Sample to Sequencing',
        icon: 'https://cdn-icons-png.flaticon.com/512/4425/4425323.png',
        parameters: [
            {
                id: 'sample',
                name: 'Sample Type',
                type: 'string',
            },
            {
                id: 'plasmid',
                name: 'Plasmid Name',
                type: 'string',
                flowId: 'plasmid-flow'
            }
        ],
        allowedConnections: [
            'gene', 'storage', 'design-primers'
        ]
    }, 
    {
        id: 'gene',
        name: 'Order Gene Fragment',
        icon: 'https://cdn-icons-png.flaticon.com/512/4848/4848965.png',
        parameters: [
            {
                id: 'fragment-sequence',
                name: 'Fragment Sequence',
                type: 'string',
            },
        ],
        allowedConnections: [
            'design-primers',
        ]
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
            },
            {
                id: 'forward-primer',
                name: 'Forward Primer',
                type: 'string',
                flowId: 'forward-primer-flow'
            },
            {
                id: 'reverse-primer',
                name: 'Reverse Primer',
                type: 'string',
                flowId: 'reverse-primer-flow'
            },
            {
                id: 'sequencing-primer',
                name: 'Sequencing Primer',
                type: 'string',
            }
        ],
        allowedConnections: [
            'rehydrate-primer'
        ]
    },
    {
        id: 'rehydrate-primer',
        name: 'Rehydrate Primers',
        icon: 'https://cdn-icons-png.flaticon.com/512/3304/3304587.png',
        parameters: [
            {
                id: 'buffer',
                name: 'Buffer',
                type: 'string',
            },
        ],
        allowedConnections: [
            'pcr'
        ]
    },
    {
        id: 'pcr',
        name: 'PCR',
        icon: 'https://cdn-icons-png.flaticon.com/512/4192/4192192.png',
        flowParams: ['plasmid-flow', 'forward-primer-flow', 'reverse-primer-flow'],
        parameters: [
            {
                id: 'melting-temp',
                name: 'Melting Temperature',
                type: 'number',
            },
            {
                id: 'cycle-time',
                name: 'Cycle Time',
                type: 'number',
            },
            {
                id: 'reaction-volume',
                name: 'Reaction Volume',
                type: 'number',
            }
        ],
        allowedConnections: [
            'run-gel', 'dpn1'
        ],
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
        id: 'dpn1',
        name: 'Digest with Dpn1',
        icon: 'https://cdn-icons-png.flaticon.com/512/647/647370.png',
        resultParams: ['pcr-product'],
        parameters: [
            {
                id: 'pcr-product-param',
                name: 'PCR Product Result',
                type: null,
                paramType: 'result'
            }
        ],
        allowedConnections: [
            'run-gel', 'column-purification'
        ],
        result : {
            id: 'dpn1-product',
            type: 'Dpn1Result',
            result: {
                id: 'dpn1-result',
                amount: 'number', // pcr result - gel amount
            }
        }
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
            },
            {
                id: 'pcr-product-param',
                name: 'PCR Product Result',
                type: null,
                paramType: 'result'
            }
        ],
        allowedConnections: [
            'column-purification'
        ],
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
            }
        ],
        allowedConnections: [
            'assembly', 'dna-gel'
        ]
    },
    {
        id: 'dna-gel',
        name: 'Purify DNA from Agarose Gel Extraction',
        icon: 'https://cdn-icons-png.flaticon.com/512/3182/3182554.png',
        resultParams: ['gel-product'],
        parameters: [],
        allowedConnections: [
            'assembly'
        ]
    },
    {
        id: 'm-cloning',
        name: 'Modular Cloning',
        icon: 'https://cdn-icons-png.flaticon.com/512/1974/1974478.png',
        resultParams: [
            'forward-primer-flow', 'reverse-primer-flow',
        ],
        parameters: [
            {
                id: 'antibiotic',
                name: 'Antibiotic',
                type: 'string',
                workflowId: 'antibiotic-workflow'
            },
            {
                id: 'buffer',
                name: 'Buffer',
                type: 'string',
            },
            {
                id: 'desired-concentration',
                name: 'Desired Concentration',
                type: 'number',
            },
            {
                id: 'ladder',
                name: 'Ladder',
                type: 'string',
            }
        ],
        allowedConnections: [
            'transformation'
        ],
        result: {
            id: 'm-cloning-product',
            type: 'MCloningResult',
        }
    },
    {
        id: 'transformation',
        name: 'Transformation',
        icon: 'https://cdn-icons-png.flaticon.com/512/203/203144.png',
        resultParams: ['m-cloning-product', 'antibiotic-workflow'],
        parameters: [],
        allowedConnections: [
            'overnight-culture', 'plate-storage'
        ],
        result: {
            id: 'transformation-product',
            type: 'TransformationResult',
        }
    },
    {
        id: 'overnight-culture',
        name: 'Overnight Inoculum',
        icon: 'https://cdn-icons-png.flaticon.com/512/3625/3625162.png',
        resultParams: ['transformation-product', 'antibiotic-workflow'],
        parameters: [
            {
                id: 'desired-volume',
                name: 'Desired Volume',
                type: 'number',
            }
        ],
        allowedConnections: [
            'miniprep'
        ],
        result: {
            id: 'overnight-culture-product',
            type: 'OvernightCultureResult',
        }
    },
    {
        id: 'miniprep-gs',
        name: 'Miniprep and Glycerol Stock',
        icon: 'https://cdn-icons-png.flaticon.com/512/1474/1474390.png',
        resultParams: ['overnight-culture-product'],
        parameters: [
            {
                id: 'desired-concentration',
                name: 'Desired Concentration',
                type: 'number',
            }
        ],
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
    }

]   