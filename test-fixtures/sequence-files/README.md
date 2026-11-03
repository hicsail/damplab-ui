# Sequence-file fixtures (biosecurity-tweaks walkthrough)

- `three-records.fasta`: accepted at pick time, "3 sequences found"; screens 3 sequences.
- `two-records.fasta`: accepted at pick time, "2 sequences found"; screens 2 sequences.
- `two-records.fasta` + `three-records.fasta` picked together (behaviour 12): 5 sequences in total.
- `mixed.fasta`: accepted, "2 sequences found" (the protein record is skipped); screens 2 sequences.
- `proteins.fasta`: refused at pick time, "has no DNA sequence in it"; never uploaded.
- `notes.txt`: refused at pick time, "is not a sequence file we can read"; never uploaded.
- `accession.txt`: refused at pick time, "is not a sequence file we can read" (an accession ID is never fetched).
- `plasmid.gb`: accepted, "1 sequence found"; screens 1 sequence.
- `construct.dna`: SnapGene file, accepted, "1 sequence found"; screens 1 sequence.
