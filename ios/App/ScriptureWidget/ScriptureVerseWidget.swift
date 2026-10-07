import SwiftUI
import WidgetKit

private let scriptureGroup = "group.com.scripturebyhand.app"
private let scriptureWidgetKind = "ScriptureVerseWidget"

private struct ScriptureVerseEntry: TimelineEntry {
    let date: Date
    let reference: String
    let verse: String
}

private struct ScriptureVerseProvider: TimelineProvider {
    func placeholder(in context: Context) -> ScriptureVerseEntry {
        ScriptureVerseEntry(date: .now, reference: "Open Scripture by Hand", verse: "Choose a verse in the app to show it here.")
    }

    func getSnapshot(in context: Context, completion: @escaping (ScriptureVerseEntry) -> Void) {
        completion(currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ScriptureVerseEntry>) -> Void) {
        let entry = currentEntry()
        let nextDay = Calendar.current.startOfDay(for: .now).addingTimeInterval(60 * 60 * 24)
        completion(Timeline(entries: [entry], policy: .after(nextDay)))
    }

    private func currentEntry() -> ScriptureVerseEntry {
        let defaults = UserDefaults(suiteName: scriptureGroup)
        let savedVerse = defaults?.string(forKey: "currentVerse")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let savedReference = defaults?.string(forKey: "currentReference")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return ScriptureVerseEntry(
            date: .now,
            reference: savedReference.isEmpty ? "Open Scripture by Hand" : savedReference,
            verse: savedVerse.isEmpty ? "Choose a verse in the app to show it here." : savedVerse
        )
    }
}

private struct ScriptureVerseWidgetView: View {
    var entry: ScriptureVerseEntry
    @Environment(\.widgetFamily) private var family

    private var content: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 6) {
                Image(systemName: "pencil.and.outline")
                    .font(.system(size: 11, weight: .semibold))
                Text("SCRIPTURE BY HAND")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .tracking(1.0)
            }
            .foregroundStyle(Color(red: 0.25, green: 0.37, blue: 0.31))

            Spacer(minLength: 0)

            Text(entry.verse)
                .font(.system(size: family == .systemSmall ? 15 : 17, weight: .regular, design: .serif))
                .foregroundStyle(Color(red: 0.14, green: 0.16, blue: 0.14))
                .lineLimit(family == .systemSmall ? 5 : 4)
                .minimumScaleFactor(0.82)
                .fixedSize(horizontal: false, vertical: true)

            Text(entry.reference)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(red: 0.27, green: 0.39, blue: 0.32))
                .lineLimit(1)
        }
        .padding(16)
        .widgetURL(URL(string: "scripturebyhand://open"))
    }

    var body: some View {
        if #available(iOSApplicationExtension 17.0, *) {
            content.containerBackground(Color(red: 0.96, green: 0.95, blue: 0.90), for: .widget)
        } else {
            content.background(Color(red: 0.96, green: 0.95, blue: 0.90))
        }
    }
}

@main
struct ScriptureVerseWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: scriptureWidgetKind, provider: ScriptureVerseProvider()) { entry in
            ScriptureVerseWidgetView(entry: entry)
        }
        .configurationDisplayName("Current verse")
        .description("Keep your current writing passage close.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
