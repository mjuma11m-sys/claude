// «ودجت حياتي» على آيفون (DW-044): نفس لقطة ودجت الأندرويد (Extras.Widget.snapshot)،
// التطبيق يكتبها بـ App Group «group.bh.hayati.app» والودجت يقراها. حجمين: صغير (الميزانية) ومتوسط (الجاي + الميزانية).
// الخصوصية: المبالغ مخفية إلا لو فعّلها المستخدم، ووقت قفل التطبيق 🔒 بس (نفس قرار DW-031).
import SwiftUI
import WidgetKit

let hayatiGroup = "group.bh.hayati.app"

struct Snap {
    var locked = false
    var rtl = true
    var labels: [String: String] = [:]
    var budgetLine = ""
    var budgetPct = -1
    var smallBig = ""
    var smallCap = ""
    var items: [(t: Date, title: String, sub: String, time: String)] = []
    var empty = true

    func label(_ k: String, _ d: String) -> String { labels[k] ?? d }

    static func load() -> Snap {
        var s = Snap()
        guard let raw = UserDefaults(suiteName: hayatiGroup)?.string(forKey: "data"),
              let obj = try? JSONSerialization.jsonObject(with: Data(raw.utf8)) as? [String: Any] else { return s }
        s.empty = false
        s.locked = obj["locked"] as? Bool ?? false
        s.rtl = obj["rtl"] as? Bool ?? true
        s.labels = obj["labels"] as? [String: String] ?? [:]
        if let b = obj["budget"] as? [String: Any] { s.budgetLine = b["line"] as? String ?? ""; s.budgetPct = b["pct"] as? Int ?? -1 }
        if let m = obj["small"] as? [String: Any] { s.smallBig = m["big"] as? String ?? ""; s.smallCap = m["cap"] as? String ?? "" }
        for it in obj["items"] as? [[String: Any]] ?? [] {
            guard let ms = it["t"] as? Double else { continue }
            s.items.append((Date(timeIntervalSince1970: ms / 1000), it["title"] as? String ?? "", it["sub"] as? String ?? "", it["time"] as? String ?? ""))
        }
        return s
    }

    // أقرب شي من الوقت (اللي بدأ قبل أقل من نص ساعة يظل)، نفس منطق HayatiWidget.java
    func next(at d: Date) -> (t: Date, title: String, sub: String, time: String)? {
        items.first { $0.t > d.addingTimeInterval(-30 * 60) }
    }
}

struct HayatiEntry: TimelineEntry {
    let date: Date
    let snap: Snap
}

struct HayatiProvider: TimelineProvider {
    func placeholder(in context: Context) -> HayatiEntry { HayatiEntry(date: Date(), snap: Snap()) }
    func getSnapshot(in context: Context, completion: @escaping (HayatiEntry) -> Void) { completion(HayatiEntry(date: Date(), snap: Snap.load())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<HayatiEntry>) -> Void) {
        let snap = Snap.load(), now = Date()
        // نقطة كل نص ساعة لين 6 ساعات، عشان «الجاي» يتغيّر مع الوقت حتى لو التطبيق مسكّر
        let entries = (0..<12).map { HayatiEntry(date: now.addingTimeInterval(Double($0) * 1800), snap: snap) }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(6 * 3600))))
    }
}

let sea = Color(red: 0.075, green: 0.388, blue: 0.420)
let sea2 = Color(red: 0.055, green: 0.290, blue: 0.314)
let mint = Color(red: 0.561, green: 0.839, blue: 0.820)
let addURL = URL(string: "bh.hayati.app://widget/add-tx")!
let pasteURL = URL(string: "bh.hayati.app://widget/paste-sms")!

struct Bar: View {
    let pct: Int
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.2))
                Capsule().fill(mint).frame(width: g.size.width * CGFloat(max(0, min(100, pct))) / 100)
            }
        }.frame(height: 6)
    }
}

struct Btn: View {
    let text: String
    let url: URL
    var body: some View {
        Link(destination: url) {
            Text(text).font(.system(size: 14, weight: .bold)).lineLimit(1).minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity).padding(.vertical, 9)
                .background(Color.white.opacity(0.15)).clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }
}

struct SmallView: View {
    let e: HayatiEntry
    var body: some View {
        let s = e.snap
        VStack(spacing: 6) {
            if s.empty {
                Text("حياتي").font(.system(size: 22, weight: .bold))
                Text(s.label("open", "افتح حياتي مرة")).font(.system(size: 12)).opacity(0.8)
            } else if s.locked {
                Text("🔒").font(.system(size: 34))
                Text(s.label("locked", "")).font(.system(size: 12)).opacity(0.8).multilineTextAlignment(.center)
            } else {
                Text(s.smallBig.isEmpty ? "+" : s.smallBig).font(.system(size: 34, weight: .bold)).lineLimit(1).minimumScaleFactor(0.5)
                Text(s.smallCap).font(.system(size: 12)).opacity(0.85).multilineTextAlignment(.center).lineLimit(2)
                if s.budgetPct >= 0 { Bar(pct: s.budgetPct) }
            }
            Spacer(minLength: 0)
            Btn(text: s.label("add", "+ مصروف"), url: addURL)
        }
        .foregroundColor(.white)
    }
}

struct MediumView: View {
    let e: HayatiEntry
    var body: some View {
        let s = e.snap
        VStack(alignment: .leading, spacing: 4) {
            if s.empty {
                Text("افتح حياتي مرة عشان يتعبّى الودجت").font(.system(size: 15, weight: .bold))
            } else if s.locked {
                Text(s.label("locked", "🔒")).font(.system(size: 17, weight: .bold))
            } else {
                if let n = s.next(at: e.date) {
                    let tomorrow = !Calendar.current.isDate(n.t, inSameDayAs: e.date)
                    Text(s.label("next", "") + " · " + (tomorrow ? s.label("tomorrow", "") + " · " : "") + n.time).font(.system(size: 12)).opacity(0.72)
                    Text(n.title).font(.system(size: 17, weight: .bold)).lineLimit(1)
                    if !n.sub.isEmpty { Text(n.sub).font(.system(size: 12)).opacity(0.8).lineLimit(1) }
                } else {
                    Text(s.label("next", "")).font(.system(size: 12)).opacity(0.72)
                    Text(s.label("none", "")).font(.system(size: 16, weight: .bold)).lineLimit(1)
                }
                Text(s.budgetLine).font(.system(size: 13)).padding(.top, 4).lineLimit(1)
                if s.budgetPct >= 0 { Bar(pct: s.budgetPct) }
            }
            Spacer(minLength: 0)
            HStack(spacing: 8) {
                Btn(text: s.label("add", "+ مصروف"), url: addURL)
                Btn(text: s.label("paste", "الصق رسالة"), url: pasteURL)
            }
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct HayatiWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: HayatiEntry
    var body: some View {
        Group {
            if family == .systemSmall { SmallView(e: entry) } else { MediumView(e: entry) }
        }
        .environment(\.layoutDirection, entry.snap.rtl ? .rightToLeft : .leftToRight)
        .containerBackground(for: .widget) { LinearGradient(colors: [sea, sea2], startPoint: .topLeading, endPoint: .bottomTrailing) }
        .widgetURL(URL(string: "bh.hayati.app://widget/open"))
    }
}

@main
struct HayatiWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HayatiWidget", provider: HayatiProvider()) { e in HayatiWidgetView(entry: e) }
            .configurationDisplayName("حياتي")
            .description("الجاي اليوم وبكرة، والميزانية، وزر «+ مصروف»")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
