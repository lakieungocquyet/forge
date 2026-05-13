// src/logging.rs

use tracing::{Event, Subscriber};
use tracing_subscriber::{
    fmt::{format::Writer, FmtContext, FormatEvent, FormatFields},
    registry::LookupSpan,
    EnvFilter,
};

struct MyFormatter;

impl<S, N> FormatEvent<S, N> for MyFormatter
where
    S: Subscriber + for<'a> LookupSpan<'a>,
    N: for<'a> FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        ctx: &FmtContext<'_, S, N>,
        mut writer: Writer<'_>,
        event: &Event<'_>,
    ) -> std::fmt::Result {
        let timestamp: chrono::format::DelayedFormat<chrono::format::StrftimeItems<'_>> = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S");
        let level: &tracing::Level     = event.metadata().level();

        if writer.has_ansi_escapes() {
            let color = match level {
                &tracing::Level::DEBUG => "\x1b[36m",
                &tracing::Level::INFO  => "\x1b[32m",
                &tracing::Level::WARN  => "\x1b[33m",
                &tracing::Level::ERROR => "\x1b[31m",
                _                      => "",
            };
            write!(writer, "[\x1b[33m{timestamp}\x1b[0m] [{color}{level}\x1b[0m] ")?;
        } else {
            write!(writer, "[{timestamp}] [{level}] ")?;
        }

        ctx.format_fields(writer.by_ref(), event)?;
        writeln!(writer)
    }
}

pub fn setup_logging() {
    tracing_subscriber::fmt()
        .event_format(MyFormatter)
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();
}