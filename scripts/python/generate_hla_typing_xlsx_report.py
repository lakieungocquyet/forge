import argparse
import pandas as pd
import logging
import time
import xlsxwriter
import pathlib

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


HEADER = [
    "Gene_name", "Number_of_different_alleles", 
    "Allele_1", "Abundance_allele_1", "Quality_allele_1",
    "Allele_2", "Abundance_allele_2", "Quality_allele_2",
    "Secondary_alleles"
]

data_frame = pd.read_csv(
    input_file_path,
    sep="\t",
    header=None,
    names=HEADER
)

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

    wrap_format = workbook.add_format({
        'text_wrap': True,
        'valign': 'top'
    })
    for i, col in enumerate(data_frame.columns):

        if col == "Gene_name":
            worksheet.set_column(i, i, 15, wrap_format)

        elif col == "Number_of_different_alleles":
            worksheet.set_column(i, i, 30, wrap_format)

        elif col in ["Allele_1", "Allele_2"]:
            worksheet.set_column(i, i, 40, wrap_format)

        elif col in ["Abundance_allele_1", "Abundance_allele_2"]:
            worksheet.set_column(i, i, 20, wrap_format)

        elif col in ["Quality_allele_1", "Quality_allele_2"]:
            worksheet.set_column(i, i, 15, wrap_format)

        elif col == "Secondary_alleles":
            worksheet.set_column(i, i, 40, wrap_format)

        else:
            worksheet.set_column(i, i, 20, wrap_format)
    # Set filter for the header row
    worksheet.autofilter(0, 0, 0, len(data_frame.columns)-1)

    row_height = 2 * 15
    worksheet.set_row(0, row_height)

    for row_num in range(1, len(data_frame_filled) + 1):
        worksheet.set_row(row_num, 15.5, data_format)

    






