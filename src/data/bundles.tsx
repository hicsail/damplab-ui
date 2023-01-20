export let bundles = [
    {
        id: 'modular-cloning-ordering',
        label: 'Modular Assembly and Cloning with Ordering',
        icon: 'https://drive.google.com/uc?id=1rsXIFQsWknecXVkMIOFrm80YFgNYlkUg',
        servicesList: ['seq', 'gene', 'design-primers', 'rehydrate-primer', 'pcr', 'dpn1', 'run-gel', 'column-purification', 'dna-gel', 'm-cloning', 'transformation', 'overnight-culture'],
        services: [
            {
                id: 'seq',
            },
            {
                id: 'gene'
            },
            {
                id:'design-primers'
            },
            {
                id: 'rehydrate-primer'
            },
            {
                id: 'pcr'
            },
            {
                id: 'dpn1'
            },
            {
                id: 'run-gel'
            },
            {
                id: 'column-purification'
            },
            {
                id: 'dna-gel'
            },
            {
                id: 'm-cloning'
            },
            {
                id: 'transformation'
            },
            {
                id: 'overnight-culture'
            }

        ]        
    },
    {
        id: 'modular-cloning-provided',
        label: 'Modular Assembly and Cloning with Provided DNA',
        icon: 'https://drive.google.com/uc?id=1rsXIFQsWknecXVkMIOFrm80YFgNYlkUg',
        servicesList: ['seq', 'design-primers', 'rehydrate-primer', 'pcr', 'dpn1', 'run-gel', 'column-purification', 'dna-gel', 'm-cloning', 'transformation', 'overnight-culture'],
        services: [
            {
                id: 'seq',
            },
            {
                id:'design-primers'
            },
            {
                id: 'rehydrate-primer'
            },
            {
                id: 'pcr'
            },
            {
                id: 'dpn1'
            },
            {
                id: 'run-gel'
            },
            {
                id: 'column-purification'
            },
            {
                id: 'dna-gel'
            },
            {
                id: 'm-cloning'
            },
            {
                id: 'transformation'
            },
            {
                id: 'overnight-culture'
            }

        ]        
    },
    {
        id: 'rna-seq',
        label: 'RNA Sequencing',
        icon: 'https://drive.google.com/uc?id=1mbl2UEtWGdybUuS5gImE_BLqqT3SE7d6',
        servicesList: ['miniprep-gs', 'glyc-storage', 'eth-perc', 'bioanalyzer', 'mRNA-enrichment', 'library-prep', 'seq'],
        services: [
            {
                id: 'miniprep-gs'
            },
            {
                id: 'glyc-storage'
            },
            {
                id: 'eth-perc'
            },
            {
                id: 'bioanalyzer'
            },
            {
                id: 'mRNA-enrichment'
            },
            {
                id: 'library-prep'
            },
            {
                id: 'seq'
            }
        ]
    },
    {
        id: 'protein-production',
        label: 'Protein Production, Purification, and Induction Bundle',
        icon: 'https://drive.google.com/uc?id=1-eu6BfldPqDK2aSrsvwmX_uyZ40K7Ddo', //Bundle 9.svg
        servicesList: ['cell-culture-induction', 'cell-lysate', 'protein-production'],
        services: [
            {
                // cell culture induction and selction
                id: 'cell-culture-induction'
            },
            {
                // cell lysate production
                id: 'cell-lysate'
            },
            {
                // protein production purification from cell lysate
                id: 'protein-production'
            }
        ] 
    }

];


// figure out how to add services over here, with collin b
