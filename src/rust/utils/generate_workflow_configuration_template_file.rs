use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::process;

use tracing::{
    error, info, warn
};

type TemplateBuilder = fn(i32) -> String;

fn generate_configuration_template_for_call_variants_workflow(number_of_samples: i32) -> String {
    let mut lines = Vec::new();
    lines.push("sample: [".to_string());
    for _ in 0..number_of_samples {
        lines.push("  {".to_string());
        lines.push("    id: null,        # unique sample identifier".to_string());
        lines.push("    platform: null,  # sequencing platform: illumina/nanopore/pacbio".to_string());
        lines.push("    read1: null,     # path to read1 FASTQ file".to_string());
        lines.push("    read2: null,     # path to read2 FASTQ file (null for single-end reads)".to_string());
        lines.push("  },".to_string());
    }
    lines.push("]".to_string());
    lines.push("".to_string());
    lines.push("output_directory: null  # path to the directory where results will be stored".to_string());
    lines.push("".to_string());
    lines.push("reference_resources: {".to_string());
    lines.push("  reference_genome: null,  # path to reference genome FASTA file".to_string());
    lines.push("  regions: null,           # path to the optional BED/interval file for targeted analysis".to_string());
    lines.push("  bqsr_known_sites: [      # path to known variant resources used for Base Quality Score Recalibration".to_string());
    lines.push("    null,".to_string());
    lines.push("    null,".to_string());
    lines.push("  ]".to_string());
    lines.push("}".to_string());
    lines.push("".to_string());
    lines.push("annotation_resources: {".to_string());
    lines.push("  dbsnp: null,         # path to dbSNP variant database VCF file".to_string());
    lines.push("  clinvar: null,       # path to ClinVar annotation VCF file".to_string());
    lines.push("  dbnsfp: null,        # path to dbNSFP functional prediction database".to_string());
    lines.push("  nhlbi_go_esp: null,  # path to NHLBI GO ESP variant database".to_string());
    lines.push("  phase3_1000g: null,  # path to 1000 Genomes Project Phase 3 variant resource".to_string());
    lines.push("}".to_string());
    lines.push("".to_string());
    lines.push("computational_resources: {".to_string());
    lines.push("  threads: 4,".to_string());
    lines.push("  minimum_memory: 8,".to_string());
    lines.push("  maximum_memory: 16,".to_string());
    lines.push("}".to_string());
    lines.join("\n")
}

fn generate_configuration_template_for_template_identify_hla_alleles_workflow(number_of_samples: i32) -> String {
    let mut lines = Vec::new();
    lines.push("sample:".to_string());

    for _ in 0..number_of_samples {
        lines.push("  - id: null,     # sample id".to_string());
        lines.push("    read1: null,  # path/to/read1/fastq/file".to_string());
        lines.push("    read2: null,  # path/to/read2/fastq/file".to_string());
    }

    lines.join("\n")
}

fn get_template_builders() -> HashMap<&'static str, TemplateBuilder> {
    let mut template_builders: HashMap<&'static str, TemplateBuilder> = HashMap::new();
    template_builders.insert("call-variants", generate_configuration_template_for_call_variants_workflow);
    template_builders.insert("identify-hla-alleles", generate_configuration_template_for_template_identify_hla_alleles_workflow);
    return template_builders;
}

pub fn generate_workflow_configuration_template_file(
    workflow_name: &str,
    output_file: &str,
    number_of_samples: i32,
) -> Result<(), Box<dyn std::error::Error>> {
    let template_builders: HashMap<&str, fn(i32) -> String> = get_template_builders();

    let template_builder: &fn(i32) -> String = template_builders
        .get(workflow_name)
        .ok_or_else(|| 
            { 
                error!("Unknown workflow: {}", workflow_name);
                process::exit(3);
            }
        )?;

    let workflow_configuration_template_file_content = template_builder(number_of_samples);

    let mut workflow_configuration_template_file = File::create(output_file)?;
    writeln!(
        workflow_configuration_template_file, 
        "{}", 
        workflow_configuration_template_file_content
    )?;
    Ok(())
}
