export let bundles = [
    {
        id: 'modular-cloning-ordering',
        label: 'Modular Assembly and Cloning with Ordering',
        icon: 'https://drive.google.com/uc?id=1rsXIFQsWknecXVkMIOFrm80YFgNYlkUg',
        services: ['seq', 'gene', 'design-primers', 'rehydrate-primer', 'pcr', 'dpn1', 
        'run-gel', 'column-purification', 'dna-gel', 'm-cloning', 
        'transformation', 'overnight-culture'],    
    },
    {
        id: 'modular-cloning-provided',
        label: 'Modular Assembly and Cloning with Provided DNA',
        icon: 'https://drive.google.com/uc?id=1rsXIFQsWknecXVkMIOFrm80YFgNYlkUg',
        services: ['seq', 'design-primers', 'rehydrate-primer', 'pcr', 'dpn1', 'run-gel', 'column-purification', 'dna-gel', 'm-cloning', 'transformation', 'overnight-culture'],
    },
    {
        id: 'rna-seq',
        label: 'RNA Sequencing',
        icon: 'https://drive.google.com/uc?id=1mbl2UEtWGdybUuS5gImE_BLqqT3SE7d6',
        services: ['miniprep-gs', 'glyc-storage', 'eth-perc', 'bioanalyzer', 'mRNA-enrichment', 'library-prep', 'seq'],
    },
    {
        id: 'protein-production',
        label: 'Protein Production, Purification, and Induction Bundle',
        icon: 'https://drive.google.com/uc?id=1-eu6BfldPqDK2aSrsvwmX_uyZ40K7Ddo', //Bundle 9.svg
        services: ['cell-culture-induction', 'cell-lysate', 'protein-production'],
    }
];


// figure out how to add services over here, with collin b
