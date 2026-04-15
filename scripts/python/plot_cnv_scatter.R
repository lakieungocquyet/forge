library(ggplot2)
library(scales)
library(gtable)
library(grid)
library(argparse)


parser <- ArgumentParser()

parser$add_argument(
    "-R", "--cnr",
    required = TRUE,
    help = "Input cnr"
)

parser$add_argument(
    "-S", "--cns",
    required = TRUE,
    help = "Input cns"
)

parser$add_argument(
    "-O",
    required = TRUE,
    help = "Output directory"
)

parser$add_argument(
    "-r",
    required = FALSE,
    default = NULL,
    help = "Optional segmentation file"
)

arguments <- parser$parse_args()

chrNamesLong = c("chr1","chr2","chr3","chr4","chr5","chr6","chr7","chr8","chr9","chr10","chr11","chr12","chr13","chr14","chr15","chr16","chr17","chr18","chr19","chr20", "chr21", "chr22", "chrX")
#chrNamesLong = c("chr1","chr2","chr3","chr4","chr5","chr6","chr7","chr8","chr9","chr10","chr11","chr12","chr13","chr14","chr15","chr16","chr17","chr18","chr19","chr20", "chr21", "chr22", "chrX", "chrY")
chrNamesShort = c("1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","X")
#chrNamesShort = c("1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","X","Y")

# Params
cnr_table = read.table(arguments$cnr, header=T)
cns_table = read.table(arguments$cns, header=T)

# Fix chromosome ordering
if (sum(cnr_table$chromosome %in% chrNamesLong) > sum(cnr_table$chromosome %in% chrNamesShort)) { 
    chrs = chrNamesLong; 
} else { 
    chrs = chrNamesShort; 
}
cnr_table = cnr_table[cnr_table$chromosome %in% chrs,]
cnr_table$chromosome = factor(cnr_table$chromosome, levels=chrs)


# By chromosome
for(chrname in unique(cnr_table$chromosome)) {
    print(chrname)
    cnr_by_chr = cnr_table[cnr_table$chromosome == chrname,]

    cns_by_chr = cns_table[cns_table$chromosome == chrname,]

    # if (nrow(cns_by_chr) == 0) 
    #     next

    # if (nrow(cnr_by_chr) == 0) 
    #     next

    p <- ggplot(
        data=cnr_by_chr,
        aes(x=start, y=log2)
    )

    if ("weight" %in% colnames(cnr_by_chr)) {
        cnr_by_chr$point_size <- scales::rescale(
            46 * (cnr_by_chr$weight^2) + 2,
            to = c(0.005, 1)
        )

        p = p + geom_point(
            pch=21, 
            color="#8d8d8d", 
            fill="#8d8d8d", 
            size = cnr_by_chr$point_size,
            alpha = 0.9
        ) + scale_size_identity()
    } else {
        p = p + geom_point(
            pch=21, 
            color="#8d8d8d", 
            fill="#8d8d8d", 
            size=0.005,
            alpha = 0.9
        )
    }

    p = p + ylab("Copy number ratio (log2)") + xlab(chrname)
    p = p + scale_x_continuous(labels=comma, breaks = scales::pretty_breaks(n=20))

    p = p + scale_y_continuous(labels=comma, breaks = scales::pretty_breaks(n=10))
    if (nrow(cns_by_chr)) { 
        p = p + geom_segment(
            data=cns_by_chr, 
            aes(x=start, y=log2, xend=end, yend=log2), 
            color="#31a354", 
            linewidth=1
        ); 
    }
    p = p + ggtitle(paste("Copy Number Variation Profile -", chrname))

    p = p + theme(
        axis.title.x = element_text(
            size = 20,
            margin = margin(t = 15, b = 15)
        ),

        axis.title.y = element_text(
            size = 20,
            margin = margin(l = 15, r = 15)
        ),
        axis.text.x = element_text(
            size = 10,
            angle=45, 
            hjust=1
        ),
        axis.text.y = element_text(
            size = 10,
            ),
        plot.title = element_text(
            hjust = 0.5,
            size = 20,
            face = "bold",
            margin = margin(t = 5, b = 5)
        )
    )
    ggsave(
        plot = p, 
        file=file.path(arguments$O, paste0("plot.", chrname, ".pdf")), 
        width=24, 
        height=12
    )
    print(warnings())
}


