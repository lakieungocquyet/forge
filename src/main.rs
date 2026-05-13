use std::{
    io::{
        stderr, Result, 
    },
    time::Duration,
    collections::HashMap,
    path::{
        PathBuf,
    },
    fs, env, process,
};

use std::error::Error;
use std::io::stdout;
use tracing::{
    error, info, warn
};

use crossterm::event::{
    Event,
    MouseButton,
    MouseEventKind,
};

use ratatui::{
    backend::CrosstermBackend,
    layout::Alignment,
    text::Line,
    widgets::{Block, BorderType, Borders, Paragraph},
    Frame,
    Terminal,
};
use crossterm::{
    execute,
    event::{
        self, 
        Event::{
            Key
        }, 
        KeyCode, poll,
        KeyEventKind 
    },
    terminal::{
        disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen
    }
};

use crossterm::event::{
    EnableMouseCapture,
    DisableMouseCapture,
};


use crate::setup_logging::setup_logging;
use crate::app::App;
use crate::ui::render;
use crate::deserialize_input_workflow_configuration_file::{
    deserialize_input_workflow_configuration_file,
    Sample,
    WorkflowConfig,
    ReferenceResources,
    ComputationalResources,
    AnnotationResources
};
use crate::generate_workflow_configuration_template_file::generate_workflow_configuration_template_file;

pub mod generate_workflow_configuration_template_file;
pub mod deserialize_input_workflow_configuration_file;
pub mod app;
pub mod setup_logging;
pub mod ui;
pub mod tui;
pub mod update;

fn main() -> Result<()> {
    setup_logging();
    let argument_vector: Vec<String> = env::args().skip(1).collect();
    const AVAILABLE_COMMANDS: &[&str] = &[        
        "init",
        "call-variants",
        "identify-hla-alleles",
        "-h", "--help",
        "-l", "--list"
    ];
    if argument_vector.len() >= 1 && !AVAILABLE_COMMANDS.contains(&argument_vector[0].as_str()) {
        error!("Unknown command: {}", &argument_vector[0]);
        process::exit(3)
    } else if argument_vector.len() == 0 {
    // ====================================================================================================
    //                                                  TUI                                                 
    // ====================================================================================================
        match render_tui() {
            Ok(_) => {}

            Err(err) => {
                error!("Failed to render TUI: {}", err);
                process::exit(3);
            }
        };
    } else if argument_vector.len() == 1 && (argument_vector[0] == "--help" || argument_vector[0] == "-h") {
    // ====================================================================================================
    //                                                 HELP                                                 
    // ====================================================================================================
        println!("");
        println!("Program: forge (bioinformatics workflow for sequencing data analysis)");
        println!("License: GNU General Public License Version 3, 29 June 2007");
        println!("Contact: La Kieu Ngoc Quyet <quyetlakn@gmail.com>");
        println!("");
        println!("Usage:");
        println!("");
        println!("         forge <command> [arguments]");
        println!("");
        println!("Commands:");
        println!("");
        println!("  Workflow commands:");
        println!("    init                  Generate a template input YAML file to start a workflow");
        println!("    call-variants         Run variant calling pipeline");
        println!("    identify-hla-alleles  Run HLA typing pipeline");
        println!("");
        println!("  Others:");
        println!("    -h, --help            Show this help message and exit");
        println!("    -l, --list            List all commands and arguments");
        println!("");
        println!("Use 'forge <command> -h' for more information on a command.");
    } else if argument_vector[0] == "--list" || argument_vector[0] == "-l" {
    // ====================================================================================================
    //                                                LIST                                                 
    // ====================================================================================================
        if argument_vector.len() == 1 {
            todo!()
        } else {
            error!("Unknown command: {}", &argument_vector[1]);
            process::exit(3)
        }
    } else if argument_vector[0] == "init" {
    // ====================================================================================================
    //                                               INIT                                                 
    // ====================================================================================================
    
        // ==================================================
        //                      INIT HELP                  
        // ==================================================
        if argument_vector.len() == 1 || (argument_vector.len() == 2 && (argument_vector[1] == "--help" || argument_vector[1] == "-h")) {
            println!("");
            println!("About: Generate a workflow configuration template file in YAML format for a new workflow");
            println!("Usage:");
            println!("");
            println!("       forge init [arguments]");
            println!("");
            println!("Arguments:");
            println!("");
            println!("  Required arguments:");
            println!("    -wf, --workflow <LIST> [WORKFLOW_NAME ...]  One or more workflow names to generate workflow configuration template file");
            println!("");
            println!("  Optional arguments:");
            println!("    -N, --number-of-samples <INT>               Number of samples (default: 1)");
            println!("    -P, --prefix <STR>                          Prefix for output file names (default: None)");
            println!("");
            println!("  Others:");
            println!("    -h, --help                                  Show this help message and exit");
        } else {
        // ==================================================
        //                        INIT                      
        // ==================================================
        
            // --------------------------------------------------
            //                 Required arguments
            // --------------------------------------------------
            let mut workflow_list: Vec<String> = Vec::new();

            // --------------------------------------------------
            //                 Optional arguments
            // --------------------------------------------------
            let mut number_of_samples: i32 = 1;
            let mut prefix: String = String::new();

            // --------------------------------------------------
            //                  Parse arguments
            // --------------------------------------------------
            let init_argument_vector: &[String] = &argument_vector[1..];
            let mut i: usize = 0;

            while i < init_argument_vector.len() {
                let argument: &String = &init_argument_vector[i];

                if argument == "-wf" || argument == "--workflow" {
                    let mut values: Vec<String> = Vec::new();
                    i += 1;

                    while i < init_argument_vector.len() && !init_argument_vector[i].starts_with('-') {
                        values.push(init_argument_vector[i].clone());
                        i += 1;
                    }
                    workflow_list = values;
                } else if argument == "-N" || argument == "--number-of-samples" {
                    number_of_samples = require_value(init_argument_vector, i, argument).parse::<i32>().unwrap();
                    i += 2;
                } else if argument == "-P" || argument == "--prefix" {
                    prefix = require_value(init_argument_vector, i, argument);
                    i += 2;
                } else {
                    error!("Unknown option: {}", &argument);
                    process::exit(3);
                }
            }
            
            // --------------------------------------------------
            //               Check required arguments
            // --------------------------------------------------
            let mut missing_required_arguments: Vec<String> = Vec::new();
            if workflow_list.is_empty() {
                missing_required_arguments.push("-wf/--workflow".to_string());
            }
            if !missing_required_arguments.is_empty() {
                error!("Missing required argument(s): {:?}", missing_required_arguments.join(", "));
                process::exit(3)
            }

            // --------------------------------------------------
            //                      Logic 
            // --------------------------------------------------
            for workflow in workflow_list {
                let filename: String;

                if !prefix.is_empty() {
                    filename = format!("{}.{}.yaml", prefix, workflow);
                } else {
                    filename = format!("{}.yaml", workflow);
                }

                let output_file = PathBuf::from(filename);

                if output_file.exists() {
                    warn!("{} exists, skip", output_file.display());
                    continue;
                }
                match generate_workflow_configuration_template_file(
                    &workflow,
                    output_file.to_str().unwrap(),
                    number_of_samples,
                ) {
                    Ok(_) => {
                        info!("Created {}", output_file.display())
                    }

                    Err(err) => {
                        error!("Failed to generate template: {}", err);
                    }
                }
            }
        }
    } else if argument_vector[0] == "call-variants" {
    // ====================================================================================================
    //                                            CALL VARIANTS                                            
    // ====================================================================================================
    
        // ==================================================
        //                  CALL VARIANTS HELP               
        // ==================================================
        if (argument_vector.len() == 1) || (argument_vector.len() == 2 && (argument_vector[1] == "--help" || argument_vector[1] == "-h")) {
            println!("");
            println!("About: Run variant calling pipeline");
            println!("Usage:");
            println!("");
            println!("       forge call-variants [arguments]");
            println!("");
            println!("Arguments:");
            println!("");
            println!("  Required arguments:");
            println!("    -I <YAML>                              Path to the YAML configuration file (e.g., run.yaml)");
            println!("    -i <SAMPLE_ID PLATFORM READ1 READ2>    Path to the YAML configuration file (e.g., run.yaml)");
            println!("    -O, --output <DIR>                     Path to the directory where results will be stored (e.g., ~/result/)");
            println!("    -R, --reference-genome <FASTA>         Path to the reference genome FASTA file (e.g. hg19.fa)");
            println!("");
            println!("  Optional arguments:");
            println!("    -r, --regions <BED>                    Path to genomic regions. Accepts BED file");
            println!("    --bqsr-known-sites <VCF>               List of known sites for Base Quality Score Recalibration (e.g., dbsnp.vcf.gz mills.vcf.gz)");
            println!("    --annotation-resources [argument(s)]   Resources used for variant annotation");
            println!("");
            println!("    Argument:");
            println!("      --dbsnp <VCF>                        Database of Single Nucleotide Polymorphisms");
            println!("      --clinvar <VCF>                      Database of clinical variants");
            println!("      --dbnsfp <TXT>                       Database of nonsynonymous SNPs' functional predictions");            
            println!("      --nhlbi-go-esp <VCF>                 The National Heart, Lung, and Blood Institute (NHLBI) \"Grand Opportunity\" Exome Sequencing Project");
            println!("      --phase3-1000g <VCF>                 The 1000 Genomes Project Phase 3");
            println!("");
            println!("    -t, --threads <INT>                    Number of threads (default: 4)");
            println!("    --minimum-memory <INT>                 Minimum memory in GB (default: 8)");
            println!("    --maximum-memory <INT>                 Maximum memory in GB (default: 16)");
            println!("");
            println!("  Others:");
            println!("    -h, --help                             Show this help message and exit");
        } else {
        // ==================================================
        //                  CALL VARIANTS               
        // ==================================================
            const CALL_VARIANTS_NORMAL_OPTIONS: &[&str] = &[
                "-I", 
                "-i",
                "-O", "--output",
                "-R", "--reference-genome",
                "-r", "--regions",
                "-t", "--threads",
                "--minimum-memory",
                "--maximum-memory",
                "--bqsr-known-sites",
                "--annotation-resources",
                "-h", "--help",
            ];
            const CALL_VARIANTS_STANDARD_ANNOTATION_RESOURCE_OPTIONS: &[&str] = &[
                "--dbsnp",
                "--clinvar",
                "--dbnsfp",                
                "--nhlbi-go-esp",
                "--phase3-1000g",
            ];

            // --------------------------------------------------
            //                 Required arguments
            // --------------------------------------------------
            let mut input_workflow_configuration_file_path: String = String::new();
            // --------------------------------------------------

            let mut input_samples: Vec<Sample> = Vec::new();
            let mut output_directory_path: String = String::new();
            let mut reference_genome_file_path: String = String::new();
            // --------------------------------------------------
            //                 Optional arguments
            // --------------------------------------------------
            let mut regions_file_path:String = String::new();
            let mut annotation_resources: HashMap<_, _> = HashMap::new();
            let mut computational_resources: HashMap<String, String> = HashMap::new();
            let mut bqsr_known_sites: Vec<String> = Vec::new();
            
            // --------------------------------------------------
            //                  Parse arguments
            // --------------------------------------------------
            let call_variants_argument_vector: &[String] = &argument_vector[1..];
            enum ParseMode {
                Normal,
                ParseStandardAnnotationResourceArguments
            }
            let mut parse_mode: ParseMode = ParseMode::Normal;

            let mut i: usize = 0;
            let mut has_input_workflow_configuration_file: bool = false;

            while i < call_variants_argument_vector.len() {
                let argument: &str = &call_variants_argument_vector[i];
                if argument == "--standard-annotation-resource" {
                    parse_mode = ParseMode::ParseStandardAnnotationResourceArguments;
                    i = i + 1;
                    continue;
                }

                if matches!(parse_mode, ParseMode::ParseStandardAnnotationResourceArguments) {
                    if CALL_VARIANTS_NORMAL_OPTIONS.contains(&argument) {
                        parse_mode = ParseMode::Normal;
                        continue;
                    }
                    if CALL_VARIANTS_STANDARD_ANNOTATION_RESOURCE_OPTIONS.contains(&argument) {
                        let key: String = argument[2..].replace('-', "_");
                        let value: String = require_value(call_variants_argument_vector, i, argument);
                        annotation_resources.insert(key, value,);
                        i = i + 2;
                        continue;
                    }
                    error!("Invalid annotation resources option: {}", &argument);
                    process::exit(3);
                }
                if argument == "-I" {
                    input_workflow_configuration_file_path = require_value(call_variants_argument_vector, i, argument);
                    has_input_workflow_configuration_file = true;
                    i = i + 2;
                } else if argument == "-i" {
                    if i + 3 >= call_variants_argument_vector.len() {
                        error!("Option -i requires 3 arguments: <SAMPLE_ID READ1 READ2>");
                        process::exit(3);
                    }

                    let sample_id: &String = &call_variants_argument_vector[i + 1];
                    let platform: &String = &call_variants_argument_vector[i + 2];
                    let read1: &String = &call_variants_argument_vector[i + 3];
                    let read2: &String = &call_variants_argument_vector[i + 4];

                    if sample_id.starts_with('-') || read1.starts_with('-') || read2.starts_with('-') {
                        error!("Invalid value for -i. Expected: <SAMPLE_ID READ1 READ2>");
                        process::exit(3);
                    }

                    input_samples.push(
                        Sample {
                            id: sample_id.clone(),
                            platform: platform.clone(),
                            read1: read1.clone(),
                            read2: read2.clone(),
                        }
                    );
                    i += 4;
                } else if argument == "-O" || argument == "--output" {
                    output_directory_path = require_value(call_variants_argument_vector, i, argument);
                    i = i + 2;
                } else if argument == "-R" || argument == "--reference-genome" {
                    reference_genome_file_path = require_value(call_variants_argument_vector, i, argument);
                    i = i + 2;
                } else if argument == "-r" || argument == "--regions" {
                    regions_file_path = require_value(call_variants_argument_vector, i, argument);
                    i = i + 2;
                } else if argument == "-t" || argument == "--threads" {
                    let key: &str = "threads";
                    let value: String = require_value(call_variants_argument_vector, i, argument);
                    computational_resources.insert(key.to_string(), value,);
                    i = i + 2;
                } else if argument == "--minimum-memory" {
                    let key: &str = "minimum_memory";
                    let value: String = require_value(call_variants_argument_vector, i, argument);
                    computational_resources.insert(key.to_string(), value,);
                    i = i + 2;
                } else if argument == "--maximum-memory" {
                    let key: &str = "maximum_memory";
                    let value: String = require_value(call_variants_argument_vector, i, argument);
                    computational_resources.insert(key.to_string(), value,);
                    i = i + 2;
                } else if argument == "--bqsr-known-sites" {
                    let value: String = require_value(call_variants_argument_vector, i, argument);
                    bqsr_known_sites.push(value);
                    i += 2;
                }

                if has_input_workflow_configuration_file {

                    let has_other_arguments: bool =
                        !input_samples.is_empty()
                        || !output_directory_path.is_empty()
                        || !reference_genome_file_path.is_empty()
                        || !regions_file_path.is_empty()
                        || !annotation_resources.is_empty()
                        || !computational_resources.is_empty()
                        || !bqsr_known_sites.is_empty();

                    if has_other_arguments {
                        error!("Option -I cannot be used together with other workflow arguments");
                        process::exit(3);
                    } else {
                        let workflow_config: std::prelude::v1::Result<deserialize_input_workflow_configuration_file::WorkflowConfig, Box<dyn Error>> = deserialize_input_workflow_configuration_file(&input_workflow_configuration_file_path);
                        // println!("{:#?}", workflow_config);
                    }
                } else {
                    let reference_resources: ReferenceResources =  ReferenceResources {
                        reference_genome: reference_genome_file_path.clone(), 
                        regions: regions_file_path.clone(),
                        bqsr_known_sites: bqsr_known_sites.clone()
                    };
                    let annotation_resources: AnnotationResources = AnnotationResources {
                        dbsnp: annotation_resources.remove("dbsnp").unwrap(),
                        clinvar: annotation_resources.remove("clinvar").unwrap(),
                        dbnsfp: annotation_resources.remove("dbnsfp").unwrap(),
                        nhlbi_go_esp: annotation_resources.remove("nhlbi_go_esp").unwrap(),
                        phase3_1000g: annotation_resources.remove("phase3_1000g").unwrap(),
                    };
                    let computational_resources: ComputationalResources = ComputationalResources {
                        threads: computational_resources.remove("threads").unwrap(),
                        minimum_memory: computational_resources.remove("minimum_memory").unwrap(),
                        maximum_memory: computational_resources.remove("maximum_memory").unwrap(),
                    };
                    let workflow_config: WorkflowConfig = WorkflowConfig {
                        sample: input_samples.clone(),
                        output_directory: output_directory_path.clone(),
                        reference_resources: reference_resources,
                        annotation_resources: annotation_resources,
                        computational_resources: computational_resources
                    };
                }

            }
        }
    
    
    }

    Ok(())

}

fn require_value(argument_vector: &[String], i: usize, argument: &str) -> String {
    let value:String;
    if i + 1 >= argument_vector.len() {
        error!("{} requires a value", argument);
        process::exit(3)
    } else if argument_vector[i + 1].starts_with("-") {
        error!("{} requires a value", argument);
        process::exit(3)
    } else {
        value=argument_vector[i + 1].clone()
    }
    return value;
}

fn render_tui() -> Result<()> {
    let mut stdout = std::io::stdout();
    enable_raw_mode()?;
    execute!(stdout, EnableMouseCapture)?;
    execute!(stderr(), EnterAlternateScreen)?;
    let mut app: App = App::new();
    let mut terminal: Terminal<CrosstermBackend<std::io::Stderr>> = Terminal::new(CrosstermBackend::new(stderr()))?;
    loop {
        if poll(Duration::from_millis(250))? {

            match event::read()? {

                Event::Key(key) => {
                    if key.kind == KeyEventKind::Press {
                        match key.code {
                            KeyCode::Char('q') => break,
                            _ => {}
                        }
                    }
                }

                Event::Resize(width, height) => {
                    app.width = width;
                    app.height = height;
                }

                _ => {}
            }
        }
        terminal.draw(|frame| {

            if app.width < 80 || app.height < 25 {
                frame.render_widget(
                    Paragraph::new(vec![
                        Line::from("Window too small!"),
                        Line::from(""),
                        Line::from("Please enlarge the terminal window."),
                        Line::from("Or press \"Ctrl -\" to increase the window size."),
                    ])
                        .block(
                            Block::new()
                                .title(" WARNING ")
                                .title_alignment(Alignment::Center)
                                .borders(Borders::ALL)
                                .border_type(BorderType::Rounded)
                        )
                        .alignment(Alignment::Center),
                    frame.area(),
                );
            } else {
                render(&mut app, frame);
            }

        })?;
    }
    execute!(std::io::stderr(), LeaveAlternateScreen)?;
    execute!(stdout, DisableMouseCapture)?;
    disable_raw_mode()?;
    Ok(())
}
