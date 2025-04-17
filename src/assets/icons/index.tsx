import ModularAssemblyAndCloningWithOrdering from "./bundles/Modular Assembly and Cloning with Ordering.png";
import ModularAssemblyAndCloningWithProvidedDNA from "./bundles/Modular Assembly and Cloning with Provided DNA.png";
import RNASequencingBundle from "./bundles/RNA Sequencing.png";
import ProteinProductionPurificationAndInductionBundle from "./bundles/Protein Production, Purification, and Induction Bundle.png";
import DNAExtractAndQPCR from "./bundles/DNA Exract and qPCR.png";
import GibsonAssemblyAndCloning from "./bundles/Gibson Assem and Cloning.png";

import CellCulture from "./services/Cell Culture.png";
import CellLysateProduction from "./services/Cell Lysate Production.png";
import CellTransformation from "./services/Cell Transformation.png";
import CleanUpAndConcentrateDNA from "./services/Clean Up and Concentrate DNA.png";
import DesignAndOrderPrimersFromThirdParty from "./services/Design and Order Primers from Third Party.png";
import DigestWithDpn1 from "./services/Digest with Dpn1.png";
import DNARNAEthanolPrecipitation from "./services/DNA RNA Ethanol Precipitation.png";
import DNARNAExtraction from "./services/DNA RNA Extraction.png";
import GibsonAssembly from "./services/Gibson Assembly.png";
import GlycerolStockCreation from "./services/Glycerol Stock Creation.png";
import Library from "./services/Library.png";
import ModularCloning from "./services/Modular Cloning.png";
import OrderingDNA from "./services/Ordering DNA.png";
import OvernightCellCulture from "./services/Overnight Cell Culture.png";
import PerformGelElectrophoresis from "./services/Perform Gel Electrophoresis.png";
import PerformPCR from "./services/Perform PCR.png";
import QPCR from "./services/qPCR.png";
import Spectrophotometric from "./services/Spectrophotometric.png";
import PlasmidDNAMiniprep from "./services/Plasmid DNA Miniprep.png";
import PlasmidDNARNAFragmentsAndOligosStorage from "./services/Plasmid DNA RNA Fragments and Oligos Storage.png";
import PrepareLiquidOvernight from "./services/Prepare Liquid Overnight.png";
import ProteinProduction from "./services/Protein Production.png";
import PurifyDNAFromAgaroseGelExtraction from "./services/Purify DNA from Agarose Gel Extraction.png";
import RehydrateDNAOligo from "./services/Rehydrate DNA Oligo.png";
import RestrictionDigestion from "./services/Restriction Digestion.png";
import RestrictionLigation from "./services/Restriction Ligation.png";
import RNASequencingService from "./services/RNA-Sequencing.png";
import SendSampleToSequencing from "./services/Send Sample to Sequencing.png";

export const ImagesBundlesDict: { [id: string] : string; } = {
    'Modular Assembly and Cloning with Ordering'             : ModularAssemblyAndCloningWithOrdering,
    'Modular Assembly and Cloning with Provided DNA'         : ModularAssemblyAndCloningWithProvidedDNA,
    'RNA Sequencing'                                         : RNASequencingBundle,
    'Protein Production, Purification, and Induction Bundle' : ProteinProductionPurificationAndInductionBundle,
    'DNA/RNA Extraction and qPCR'                            : DNAExtractAndQPCR,
    'Gibson Assembly and Cloning with Provided DNA'          : GibsonAssemblyAndCloning,
    'Gibson Assembly and Cloning with Ordering'              : GibsonAssemblyAndCloning,
    'Library Prep (16S,ITS)'                                 : RNASequencingBundle,
  };

export const ImagesServicesDict: { [id: string] : string; } = {
    'Cell Culture Induction and Selection'                  : CellCulture,
    'Cell Lysate Production'                                : CellLysateProduction,
    'Transformation'                                        : CellTransformation,
    'Clean Up and Concentrate DNA'                          : CleanUpAndConcentrateDNA,
    'Design and Order Primers'                              : DesignAndOrderPrimersFromThirdParty,
    'Digest with Dpn1'                                      : DigestWithDpn1,
    'DNA RNA Ethanol Precipitation'                         : DNARNAEthanolPrecipitation,
    'DNA RNA Extraction'                                    : DNARNAExtraction,
    'Gibson Assembly'                                       : GibsonAssembly,
    'Glycerol Stock Storage'                                : GlycerolStockCreation,
    'Fragment Analyzer'                                     : Library,
    'Modular Cloning'                                       : ModularCloning,
    'Order Gene Fragment'                                   : OrderingDNA,
    'Overnight Innoculums of Bacteria Cell Culture Storage' : OvernightCellCulture,
    'Gel Electrophoresis'                                   : PerformGelElectrophoresis,
    'PCR'                                                   : PerformPCR,
    'qPCR'                                                  : QPCR,
    'Spectrophotometric Assay'                              : Spectrophotometric,
    'Miniprep and Glycerol Stock'                           : PlasmidDNAMiniprep,
    'Plasmid, DNA fragment, or oligo storage'               : PlasmidDNARNAFragmentsAndOligosStorage,
    'Overnight Inoculum'                                    : PrepareLiquidOvernight,
    'Protein Production and Purification from Cell Lysate'  : ProteinProduction,
    'Purify DNA from Agarose Gel Extraction'                : PurifyDNAFromAgaroseGelExtraction,
    'Rehydrate Primers'                                     : RehydrateDNAOligo,
    'Restriction Digest'                                    : RestrictionDigestion,
    'Restriction Ligation'                                  : RestrictionLigation,
    'Next Generation Sequencing'                            : RNASequencingService,
    'Send Sample to Sequencing'                             : SendSampleToSequencing,
};
