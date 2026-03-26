import sys
import logging
import time
import os

def setup_logging(
    logger_name: str,
    log_file_path: str = None,
    log_to_file: bool = True
    ):
    logger = logging.getLogger(f"{logger_name}")
    logger.setLevel(logging.INFO)
    
    if logger.hasHandlers():
        logger.handlers.clear()


    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
    }
    RESET = "\033[0m"

    def format_log(record, use_color=True):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(record.created))  # UTC
        level = record.levelname
        message = record.getMessage()

        LEVEL_WIDTH = 9

        raw_block = f"[{level}]"
        level_block = raw_block.ljust(LEVEL_WIDTH)

        if use_color:
            color = COLORS.get(level, "")
            level_colored = f"{color}{level}{RESET}"

            level_block = level_block.replace(level, level_colored)
            timestamp = f"\033[33m{timestamp}\033[0m"

        return f"[{timestamp}] {level_block} {message}"
        

    class SimpleFormatter(logging.Formatter):
        def __init__(self, use_color):
            super().__init__()
            self.use_color = use_color

        def format(self, record):
            return format_log(record, self.use_color)    
        

    # STREAM
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(SimpleFormatter(use_color=True))
    logger.addHandler(stream_handler)


    # FILE 
    if log_to_file and log_file_path:
        os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
        file_handler = logging.FileHandler(f"{log_file_path}", mode="a", encoding="utf-8")
        file_handler.setFormatter(SimpleFormatter(use_color=False))
        logger.addHandler(file_handler)
    
    return logger