export let bundles = [
    {
        id: 'modular-cloning-ordering',
        label: 'Modular Assembly and Cloning with Ordering',
        // icon: 'https://drive.google.com/uc?id=1rsXIFQsWknecXVkMIOFrm80YFgNYlkUg',
        icon: 'https://drive.google.com/thumbnail?id=1jIPi2_w650pbpCFcdhOL0KXEYPWgFWPn',
        services: ['seq', 'gene', 'design-primers', 'rehydrate-primer', 'pcr', 'run-gel', 
            'dna-gel', 'm-cloning', 'transformation', 'overnight-culture'],    
    },
    {
        id: 'modular-cloning-provided',
        label: 'Modular Assembly and Cloning with Provided DNA',
        // icon: 'https://drive.google.com/uc?id=1rsXIFQsWknecXVkMIOFrm80YFgNYlkUg',
        icon: 'https://drive.google.com/thumbnail?id=1TOGeovPsTLZiAsVkc1205nk9w9yTyYkj',
        services: ['seq', 'design-primers', 'rehydrate-primer', 'pcr', 'dna-gel', 'm-cloning', 
            'transformation', 'overnight-culture'],
    },
    {
        id: 'rna-seq',
        label: 'RNA Sequencing',
        // icon: 'https://drive.google.com/uc?id=1mbl2UEtWGdybUuS5gImE_BLqqT3SE7d6',
        icon: 'https://drive.google.com/thumbnail?id=17GlfivFCDd6OMK__6MOmpA9tf3joX2Ft',
        services: ['miniprep-gs', 'glyc-storage', 'eth-perc', 'frag-analyzer', 'mRNA-enrichment', 'seq'],
    },
    {
        id: 'protein-production',
        label: 'Protein Production, Purification, and Induction Bundle',
        // icon: 'https://drive.google.com/uc?id=1-eu6BfldPqDK2aSrsvwmX_uyZ40K7Ddo', //Bundle 9.svg
        icon: 'https://drive.google.com/thumbnail?id=1ziGsSXzM0tGpjfhIiVLv8Q6IbZ5UF-nK',
        services: ['cell-culture-induction', 'cell-lysate', 'protein-production'],
    }
];


// figure out how to add services over here, with collin b
