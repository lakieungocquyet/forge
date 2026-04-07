import argparse
import pandas as pd
from cyvcf2 import VCF
import sys
import logging
import time
import xlsxwriter
import pathlib

GENERAL_INFO =  [
                "CHROM"             ,"POS"               ,"REF"               ,"ALT"               ,"DP"                ,
                "AD"                ,"QUAL"              ,"MQ"                ,"Zygosity"          ,"FILTER"            ,
                "Effect"            ,"Putative_Impact"   ,"Gene_Name"         ,"Feature_Type"      ,"Feature_ID"        ,
                "Transcript_BioType","Rank/Total"        ,"HGVS.c"            ,"HGVS.p"            ,"REF_AA"            ,
                "ALT_AA"            ,"cDNA_pos"          ,"cDNA_length"       ,"CDS_pos"           ,"CDS_length"        ,
                "AA_pos"            ,"AA_length"         ,"Distance"
                ]

logger = logging.getLogger("logger")

parser = argparse.ArgumentParser(
        description = "None"
    )
parser.add_argument(
        "-I", "--input",
        required = True, 
        type = str, 
        help = "None"
    )

parser.add_argument(
        "-O", "--output",
        required = True, 
        type = str, 
        help = "None"
    )
arguments = parser.parse_args()

input_file_path = arguments.input
output_file_path = arguments.output

VCF_FILE = VCF(f"{input_file_path}")
data = []
HEADER = GENERAL_INFO

TOTAL_RECORD = sum(1 for _ in VCF(f"{input_file_path}"))
logger.info(f"Total variant: {TOTAL_RECORD:,}")
VARIANT_INDEX = 0
for record in VCF_FILE:
    VARIANT_INDEX += 1
    logger.info(f"processing variant {VARIANT_INDEX:,}/{TOTAL_RECORD:,}")  

    row = {}
    # ==================================================================================================== #
    #                                           General fields
    # ==================================================================================================== #
    row["CHROM"] = record.CHROM
    row["POS"] = record.POS
    row["REF"] = record.REF
    row["ALT"] = record.ALT[0] if record.ALT else None
    dp_array = record.format("DP", None)
    row["DP"] = int(dp_array[0][0]) if dp_array is not None else None

    row["QUAL"] = round(record.QUAL,2) 
    row["MQ"] = round(record.INFO.get("MAPQ", None),2) 
    gt = record.genotypes[0] 
    if gt[0] == gt[1]:
        row["Zygosity"] = "HOM" if gt[0] != 0 else "Ref"
    else:
        row["Zygosity"] = "HET"
    row["FILTER"] = record.FILTER if record.FILTER else "PASS"

    
    data.append(row)

data_frame = pd.DataFrame(data, columns=HEADER)
with pd.ExcelWriter(f"{output_file_path}", engine="xlsxwriter") as writer:
    data_frame_filled = data_frame.fillna(".")
    data_frame_filled.to_excel(writer, index=False, sheet_name="Sheet 1")
    workbook = writer.book
    worksheet = writer.sheets["Sheet 1"]

    header_format = workbook.add_format({
        'bold': True,
        'font_color': 'black',
        'font_size': 9,  
        'bg_color': "#ADCAE6",
        'border': 1,
        'font_name': 'Arial',
        'align': 'center',
        'valign': 'vcenter',
        'text_wrap': True,
    })
    data_format = workbook.add_format({
        'font_name': 'Arial',
        'font_color': 'black',
        'font_size': 9,  
        'bold': False,
        'text_wrap': False, 
        'align': 'general' 
    })
    # Add header format
    for col_num, value in enumerate(data_frame.columns.values):
        worksheet.write(0, col_num, value, header_format)

    # Set filter for the header row
    worksheet.autofilter(0, 0, 0, len(data_frame.columns)-1)

    row_height = 7 * 15
    worksheet.set_row(0, row_height)

    for row_num in range(1, len(data_frame_filled) + 1):
        worksheet.set_row(row_num, 15.5, data_format)


