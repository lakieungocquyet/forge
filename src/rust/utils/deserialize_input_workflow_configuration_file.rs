use serde::{Deserialize, Serialize};
use std::fs;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize,Clone)]
pub struct Sample {
    pub id: String,
    pub platform: String,
    pub read1: String,
    pub read2: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReferenceResources {
    pub reference_genome: String,
    pub regions: String,
    pub bqsr_known_sites: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnnotationResources {
    pub dbsnp: String,
    pub clinvar: String,
    pub dbnsfp: String,
    pub nhlbi_go_esp: String,
    pub phase3_1000g: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComputationalResources {
    pub threads: String,
    pub minimum_memory: String,
    pub maximum_memory: String,
}

#[derive(Debug, Deserialize)]
pub struct WorkflowConfig {
    pub sample: Vec<Sample>,
    pub output_directory: String,
    pub reference_resources: ReferenceResources,
    pub annotation_resources: AnnotationResources,
    pub computational_resources: ComputationalResources
}

pub fn deserialize_input_workflow_configuration_file(path: &str) -> Result<WorkflowConfig, Box<dyn Error>> {
    let content = fs::read_to_string(path)?;
    let workflow_config: WorkflowConfig = serde_yaml::from_str(&content)?;
    Ok(workflow_config)
}