export let bundles = [
    {
        id: 'modular-cloning-ordering',
        label: 'Modular Assembly and Cloning with Ordering',
        icon: 'https://drive.google.com/uc?id=1rsXIFQsWknecXVkMIOFrm80YFgNYlkUg',
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
        id: 'rna-seq',
        label: 'RNA Sequencing',
        icon: 'https://drive.google.com/uc?id=1mbl2UEtWGdybUuS5gImE_BLqqT3SE7d6',
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
    }

];


// figure out how to add services over here, with collin b
