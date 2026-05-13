import sys
sys.dont_write_bytecode = True
import subprocess
import yaml
import json
from datetime import datetime, UTC
import pathlib
import logging
from src.python.utils.setup_logging import setup_logging
from src.python.utils.load_yaml_file import load_yaml_file
from src.python.utils.generate_template_yaml import generate_template_yaml

def require_value(argument_vector, i, argument):

    setup_logging(
        logger_name = "logger",
    )
    logger = logging.getLogger("logger")

    if i + 1 >= len(argument_vector):
        logger.error(f"{argument} requires a value")
        sys.exit(3)
    value = argument_vector[i + 1]

    if value.startswith("-"):
        logger.error(f"{argument} requires a value")
        sys.exit(3)
    return value

def main(argument_vector):
    setup_logging(
        logger_name = "logger",
    )
    logger = logging.getLogger("logger")
    AVAILABLE_COMMANDS={
        "init",
        "call-variants",
        "identify-hla-alleles",
        "-h", "--help",
        "-l", "--list"
    }
    argument_vector = argument_vector.copy()
    
    if len(argument_vector) >= 1 and argument_vector[0] not in AVAILABLE_COMMANDS:
        logger.error(f"Unknown command: {argument_vector[0:]}")
        sys.exit(3)
    #====================================================================================================#
    #                                               HELP                                                 #
    #====================================================================================================#
    elif len(argument_vector) == 0 or (len(argument_vector) == 1 and (argument_vector[0] == "--help" or argument_vector[0] == "-h")):
        print("")
        print("Program: forge (bioinformatics workflow for sequencing data analysis)")
        print("License: GNU General Public License Version 3, 29 June 2007")
        print("Contact: La Kieu Ngoc Quyet <quyetlakn@gmail.com>")
        print("")
        print("Usage:")
        print("")
        print("         forge <command> [arguments]")
        print("")
        print("Commands:")
        print("")
        print("  Workflow commands:")
        print("    init                  Generate a template input YAML file to start a workflow")
        print("    call-variants         Run variant calling pipeline")
        print("    identify-hla-alleles  Run HLA typing pipeline")
        print("")
        print("  Others:")
        print("    -h, --help            Show this help message and exit")
        print("    -l, --list            List all commands and arguments")
        print("")
        print("Use 'forge <command> -h' for more information on a command.")
    #====================================================================================================#
    #                                               LIST                                                 #
    #====================================================================================================#
    elif argument_vector[0] == "--list" or argument_vector[0] == "-l":
        if len(argument_vector) == 1:
            print("")
            print("Program: forge (bioinformatics workflow for sequencing data analysis)")
            print("License: GNU General Public License Version 3, 29 June 2007")
            print("Contact: La Kieu Ngoc Quyet <quyetlakn@gmail.com>")
            print("")
            print("Usage:")
            print("")
            print("         forge <command> [arguments]")
            print("")
            print("Commands:")
            print("")
            print("-----------------------------------------------------------------------------------------------------------------------------------------------------")
            print("Command group        command                 arguments                                                                                               ")
            print("-----------------------------------------------------------------------------------------------------------------------------------------------------")
            print("Workflow commands    init                    Required arguments:                                                                                     ")
            print("                                               -wf, --workflow <LIST> [WORKFLOW_NAME ...]  List of workflow names to generate template YAML files    ")
            print("                                                                                                                                                     ")
            print("                                             Optional arguments:                                                                                     ")
            print("                                               -N, --number-of-samples <INT>               Number of samples (default: 1)                            ")
            print("                                               -P, --prefix <STR>                          Prefix for output file names (default: None)              ")
            print("                                                                                                                                                     ")
            print("                                             Others:                                                                                                 ")
            print("                                               -h, --help                                  Show this help message and exit                           ")
            print("                     --------------------------------------------------------------------------------------------------------------------------------")
            print("                     call-variants           Required arguments:                                                                                     ")
            print("                                               -I, --input <YAML>                          Path to the configuration YAML file                       ")
            print("                                               -O, --output <DIR>                          Path to the directory where results will be stored        ")
            print("                                               -R, --reference-genome <FASTA>              Path to the reference genome FASTA file                   ")
            print("                                                                                                                                                     ")
            print("                                             Optional arguments:                                                                                     ")
            print("                                               -r, --regions <BED>                         Path to the genomic regions BED file                      ")
            print("                                               --bqsr-known-sites <LIST> [<VCF> ...]       List of known sites for Base Quality Score Recalibration  ")
            print("                                               --standard-annotation-resource [arguments]  Standard databases used for variant annotation            ")  
            print("                                                                                                                                                     ")
            print("                                                 Arguments: --dbsnp138 <VCF>               Path to dbSNP build 138 VCF file                          ")
            print("                                                            --clinvar <VCF>                Path to ClinVar annotation VCF file                       ")
            print("                                                            --esp6500 <VCF>                Path to ESP6500 population variant VCF file               ")
            print("                                                            --1000g-phase3 <VCF>           Path to 1000 Genomes Phase 3 frequency VCF file           ")
            print("                                                            --dbnsfp <TXT>                 Path to dbNSFP functional prediction TXT file             ")
            print("                                                                                                                                                     ")
            print("                                               -t, --threads <INT>                         Number of threads to use (default: 4)                     ")
            print("                                               --min-memory <INT>                          Minimum memory in GB (default: 8)                         ")
            print("                                               --max-memory <INT>                          Maximum memory in GB (default: 16)                        ")
            print("                                                                                                                                                     ")
            print("                                             Others:                                                                                                 ")
            print("                                               -h, --help                                  Show this help message and exit                           ")
            print("                     --------------------------------------------------------------------------------------------------------------------------------")
            print("                     identify-hla-alleles    Required arguments:                                                                                     ")
            print("                                               -I, --input <YAML>                          Path to the configuration YAML file                       ")
            print("                                               -O, --output <DIR>                          Path to the directory where results will be stored        ")
            print("                                                                                                                                                     ")
            print("                                             Others:                                                                                                 ")
            print("                                               -h, --help                                  Show this help message and exit                           ")
            print("-----------------------------------------------------------------------------------------------------------------------------------------------------")
            print("Other commands       -h, --help                                                            Show this help message and exit                           ")
            print("                     --------------------------------------------------------------------------------------------------------------------------------")
            print("                     -l, --list                                                            List all commands and arguments                           ")
            print("-----------------------------------------------------------------------------------------------------------------------------------------------------")
        else:
            logger.error(f"Unknown command: {argument_vector[0:]}")
            sys.exit(3)
    #====================================================================================================#
    #                                               INIT                                                 #
    #====================================================================================================#    
    elif argument_vector[0] == "init":
        #==================================================#
        #                       INIT HELP                  #
        #==================================================#
        if (len(argument_vector) == 1) or (len(argument_vector) == 2 and (argument_vector[1] == "--help" or argument_vector[1] == "-h")):
            print("")
            print("About: Generate a template input YAML file to start a workflow")
            print("Usage:")
            print("")
            print("       forge init [arguments]")
            print("")
            print("Arguments:")
            print("")
            print("  Required arguments:")
            print("    -wf, --workflow <LIST> [WORKFLOW_NAME ...]  One or more workflow names to generate template YAML files")
            print("")
            print("  Optional arguments:")
            print("    -N, --number-of-samples <INT>               Number of samples (default: 1)")
            print("    -P, --prefix <STR>                          Prefix for output file names (e.g. test_ → test_call-variants.yaml) (default: None)")
            print("")
            print("  Others:")
            print("    -h, --help                                  Show this help message and exit")
        #==================================================#
        #                        INIT                      #
        #==================================================#
        else:
            # --------------------------------------------------
            #                 Required arguments
            # --------------------------------------------------
            workflow_list = []

            # --------------------------------------------------
            #                 Optional arguments
            # --------------------------------------------------
            number_of_samples = 1
            prefix = None

            # --------------------------------------------------
            #                  Parse arguments
            # --------------------------------------------------
            init_argument_vector = argument_vector[1:]
            i = 0
            while i < len(init_argument_vector):
                argument = init_argument_vector[i]
                if argument in ("-wf", "--workflow"):
                    values = []
                    i += 1
                    while i < len(init_argument_vector) and not init_argument_vector[i].startswith("-"):
                        values.append(init_argument_vector[i])
                        i += 1
                    workflow_list = values
                elif argument in ("-N", "--number-of-samples"):
                    number_of_samples = int(require_value(init_argument_vector, i, argument))
                    i += 2
                elif argument in ("-P", "--prefix"):
                    prefix = require_value(init_argument_vector, i, argument)
                    i += 2
                else:
                    logger.error(f"Unknown option: {argument}")
                    sys.exit(3)
            
            # --------------------------------------------------
            #               Check required arguments
            # --------------------------------------------------
            missing_required_arguments = []
            if not workflow_list:
                missing_required_arguments.append("-wf/--workflow")
            
            if missing_required_arguments:
                logger.error("Missing required argument(s): %s", ", ".join(missing_required_arguments))
                sys.exit(3)

            setup_logging(
                logger_name = "logger"
            )
            logger = logging.getLogger("logger")

            for workflow in workflow_list:
                if prefix:
                    filename = f"{prefix}.{workflow}.yaml"
                else:
                    filename = f"{workflow}.yaml"

                output = pathlib.Path(filename)

                if output.exists():
                    logger.warning(f"{output} exists, skip")
                    continue

                generate_template_yaml(workflow, output, number_of_samples)
                logger.info(f"Created {output}")

    #====================================================================================================#
    #                                           CALL VARIANTS                                            #
    #====================================================================================================#
    elif argument_vector[0] == "call-variants":
        #==================================================#
        #                 CALL VARIANTS HELP               #
        #==================================================#
        if (len(argument_vector) == 1) or (len(argument_vector) == 2 and (argument_vector[1] == "--help" or argument_vector[1] == "-h")):
            print("")
            print("About: Run variant calling pipeline")
            print("Usage:")
            print("")
            print("       forge call-variants [arguments]")
            print("")
            print("Arguments:")
            print("")
            print("  Required arguments:")
            print("    -I, --input <YAML>                          Path to the YAML configuration file (e.g., run.yaml)")
            print("    -O, --output <DIR>                          Path to the directory where results will be stored (e.g., ~/result/)")
            print("    -R, --reference-genome <FASTA>              Path to the reference genome FASTA file (e.g. hg19.fa)")
            print("")
            print("  Optional arguments:")
            print("    -r, --regions <BED>                         Path to genomic regions to process. Accepts BED file")
            print("    --bqsr-known-sites <LIST> [<VCF> ...]       List of known sites for Base Quality Score Recalibration (e.g., dbsnp.vcf.gz mills.vcf.gz)")
            print("    --standard-annotation-resource [arguments]  Standard databases used for variant annotation")  
            print("")
            print("      Arguments: --dbsnp138 <VCF>               dbSNP build 138 variant database")
            print("                 --clinvar <VCF>                ClinVar clinical significance annotations")
            print("                 --esp6500 <VCF>                NHLBI Exome Sequencing Project population variants")
            print("                 --1000g-phase3 <VCF>           1000 Genomes Project Phase 3 population frequencies")
            print("                 --dbnsfp <TXT>                 dbNSFP functional prediction database")
            print("")
            print("    -t, --threads <INT>                         Number of threads to use (default: 4)")
            print("    --min-memory <INT>                          Minimum memory in GB (default: 8)")
            print("    --max-memory <INT>                          Maximum memory in GB (default: 16)")
            print("")
            print("  Others:")
            print("    -h, --help                                  Show this help message and exit")
        #==================================================#
        #                    CALL VARIANTS                 #
        #==================================================#
        else:
            # --------------------------------------------------
            #                 Required arguments
            # --------------------------------------------------
            input_yaml_file_path = None
            output_dir_path = None
            reference_genome_file_path = None

            # --------------------------------------------------
            #                 Optional arguments
            # --------------------------------------------------
            standard_annotation_resources_dict = {}
            compute = {}
            NORMAL_OPTIONS = {
                "-I", "--input",
                "-O", "--output",
                "-R", "--reference-genome",
                "-r", "--regions",
                "-t", "--threads",
                "--min-memory",
                "--max-memory",
                "--bqsr-known-sites",
                "--standard-annotation-resource",
                "-h", "--help",
            }
            ANNOTATION_RESOURCES_OPTIONS = {
                "--dbsnp138",
                "--clinvar",
                "--esp6500",
                "--1000g-phase3",
                "--dbnsfp",
            }

            # --------------------------------------------------
            #                  Parse arguments
            # --------------------------------------------------
            parse_mode = "normal"
            call_variants_argument_vector = argument_vector[1:]
            i = 0
            while i < len(call_variants_argument_vector):
                argument = call_variants_argument_vector[i]

                if argument == "--standard-annotation-resource":
                    parse_mode = "parse_standard_annotation_resource_argument"
                    i += 1
                    continue
                if parse_mode == "parse_standard_annotation_resource_argument":
                    if argument in NORMAL_OPTIONS: 
                        parse_mode = "normal"
                        continue
                    if argument in ANNOTATION_RESOURCES_OPTIONS:
                            key = argument[2:].replace("-", "_")
                            standard_annotation_resources_dict[key] = require_value(call_variants_argument_vector, i, argument)
                            i += 2
                            continue
                    logger.error(f"Invalid annotation resources option: {argument}")
                    sys.exit(3)
                if argument in ("-I", "--input"):
                    input_yaml_file_path = require_value(call_variants_argument_vector, i, argument)
                    i += 2
                elif argument in ("-O", "--output"):
                    output_dir_path = require_value(call_variants_argument_vector, i, argument)
                    i += 2
                elif argument in ("-R", "--reference-genome"):
                    reference_genome_file_path = require_value(call_variants_argument_vector, i, argument)
                    i += 2
                elif argument in ("-r", "--regions"):
                    regions_file_path = require_value(call_variants_argument_vector, i, argument)
                    i += 2
                elif argument in ("-t", "--threads"):
                    compute["threads"] = require_value(call_variants_argument_vector, i, argument)
                    i += 2
                elif argument == "--min-memory":
                    compute["min_memory_gb"] = require_value(call_variants_argument_vector, i, argument)
                    i += 2
                elif argument == "--max-memory":
                    compute["max_memory_gb"] = require_value(call_variants_argument_vector, i, argument)
                    i += 2
                elif argument == "--bqsr-known-sites":
                    values = []
                    i += 1
                    while i < len(call_variants_argument_vector) and not call_variants_argument_vector[i].startswith("-"):
                        values.append(call_variants_argument_vector[i])
                        i += 1
                    bqsr_known_sites = values
                else:
                    logger.error(f"Unknown option: {argument}")
                    sys.exit(3)
                
            missing_required_arguments = []
            if input_yaml_file_path is None:
                missing_required_arguments.append("-I/--input")

            if output_dir_path is None:
                missing_required_arguments.append("-O/--output")

            if reference_genome_file_path is None:
                missing_required_arguments.append("-R/--reference-genome")

            if missing_required_arguments:
                logger.error("Missing required argument(s): %s", ", ".join(missing_required_arguments))
                sys.exit(3)

            utc_time = datetime.now(UTC).strftime("%Y-%m-%d_%Hh-%Mm-%Ss_UTC")
            workflow_title = "call-variants"
            output_dir_path = pathlib.Path(output_dir_path) / f"{utc_time}_{workflow_title}"
            output_dir_path.mkdir(parents=True, exist_ok=True)
            setup_logging(
                logger_name = "logger",
                log_file_path = f"{output_dir_path}/log/workflow.console.log"
            )
            logger = logging.getLogger("logger")

            input_data = load_yaml_file(input_yaml_file_path)
            resources = {
                "reference_genome_file_path": reference_genome_file_path,
                "bqsr_known_sites_list": bqsr_known_sites,
                "standard_annotation_resources_dict": standard_annotation_resources_dict,
                "regions_file_path": regions_file_path,
            }
            context = {
                "input_data": input_data,
                "output_dir_path": output_dir_path,
                "compute": compute,
                "resources": resources
            }

            context_yaml = yaml.dump(context["input_data"], sort_keys=False, default_flow_style=False ).rstrip()
            logger.info(f"Input information:\n{context_yaml}")

            context_json = json.dumps(context, default=str)
            print(json.dumps(context, default=str, indent=4))
            try:
                subprocess.run(
                    [
                        "bash", f"{pathlib.Path(__file__).parent}/scripts/bash/call_variants.sh",
                        context_json
                    ], 
                    shell=False, 
                    check=True
                    )
            except KeyboardInterrupt:
                pass
            finally:
                sys.exit(0)
    #====================================================================================================#
    #                                        IDENTIFY HLA ALLELES                                        #
    #====================================================================================================#
    elif argument_vector[0] == "identify-hla-alleles":
        #==================================================#
        #              IDENTIFY HLA ALLELES HELP           #
        #==================================================#
        if (len(argument_vector) == 1) or (len(argument_vector) == 2 and (argument_vector[1] == "--help" or argument_vector[1] == "-h")):
            print("")
            print("About: Run HLA typing pipeline")
            print("Usage:")
            print("")
            print("       forge identify-hla-alleles [arguments]")
            print("")
            print("Arguments:")
            print("")
            print("  Required arguments:")
            print("    -I, --input <YAML>  Path to the YAML configuration file (e.g., run.yaml)")
            print("    -O, --output <DIR>  Path to the directory where results will be stored (e.g., ~/result/)")
            print("")
            print("  Others:")
            print("    -h, --help          Show this help message and exit")
        #==================================================#
        #                IDENTIFY HLA ALLELES              #
        #==================================================#
        else:
            # --------------------------------------------------
            #                 Required arguments
            # --------------------------------------------------
            input_yaml_file_path = None
            output_dir_path = None

            # --------------------------------------------------
            #                 Optional arguments
            # --------------------------------------------------


            # --------------------------------------------------
            #                  Parse arguments
            # --------------------------------------------------
            identify_hla_alleles_argument_vector = argument_vector[1:]
            i = 0
            while i < len(identify_hla_alleles_argument_vector):
                argument = identify_hla_alleles_argument_vector[i]

                if argument in ("-I", "--input"):
                    input_yaml_file_path = require_value(identify_hla_alleles_argument_vector, i, argument)
                    i += 2
                elif argument in ("-O", "--output"):
                    output_dir_path = require_value(identify_hla_alleles_argument_vector, i, argument)
                    i += 2
                else:
                    logger.error(f"Unknown option: {argument}")
                    sys.exit(3)
            
            missing_required_arguments = []
            if input_yaml_file_path is None:
                missing_required_arguments.append("-I/--input")

            if output_dir_path is None:
                missing_required_arguments.append("-O/--output")

            if missing_required_arguments:
                logger.error("Missing required argument(s): %s", ", ".join(missing_required_arguments))
                sys.exit(3)

            utc_time = datetime.now(UTC).strftime("%Y-%m-%d_%Hh-%Mm-%Ss_UTC")
            workflow_title = "identify-hla-alleles"
            output_dir_path = pathlib.Path(output_dir_path) / f"{utc_time}_{workflow_title}"
            output_dir_path.mkdir(parents=True, exist_ok=True)
            setup_logging(
                logger_name = "logger",
                log_file_path = f"{output_dir_path}/log/workflow.console.log"
            )
            logger = logging.getLogger("logger")

            input_data = load_yaml_file(input_yaml_file_path)
            context = {
                "input_data": input_data,
                "output_dir_path": output_dir_path,
            }
            context_yaml = yaml.dump(context["input_data"], sort_keys=False, default_flow_style=False ).rstrip()
            logger.info(f"Input information:\n{context_yaml}")

            context_json = json.dumps(context, default=str)
            print(json.dumps(context, default=str, indent=4))

            try:
                subprocess.run(
                    [
                        "bash", f"{pathlib.Path(__file__).parent}/scripts/bash/identify_hla_alleles.sh",
                        context_json
                    ], 
                    shell=False, 
                    check=True
                    )
            except KeyboardInterrupt:
                pass
            finally:
                sys.exit(0)

if __name__ == "__main__":
    main(sys.argv[1:])