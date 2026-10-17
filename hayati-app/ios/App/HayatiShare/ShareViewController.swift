// «شارك ← حياتي» بالآيفون (DW-046): يستلم نص رسالة البنك من قائمة المشاركة ويحطه بـ App Group،
// والتطبيق ياخذه أول ما ينفتح (ShareInPlugin) ويمرّره لنفس مسار الأندرويد (موافقة أول مرة، تمويه الأرقام).
// ما يقرا الرسائل بنفسه، وما يرسل شي لأي مكان.
// DW-062: وملف (كشف حساب Excel/CSV/PDF أو ملف رسائل): ينسخه لمجلد App Group «share/» والتطبيق ياخذه ويفتح «استيراد الحساب كامل».
import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    static let group = "group.bh.hayati.app"
    static let maxChars = 2000
    static let maxFile = 15 * 1024 * 1024
    private let label = UILabel()

    private var arabic: Bool { (Locale.preferredLanguages.first ?? "ar").hasPrefix("ar") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.12, blue: 0.24, alpha: 0.96)
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .white
        label.font = .systemFont(ofSize: 19, weight: .semibold)
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        let done = UIButton(type: .system)
        done.setTitle(arabic ? "تم" : "Done", for: .normal)
        done.titleLabel?.font = .systemFont(ofSize: 18, weight: .bold)
        done.tintColor = UIColor(red: 0.43, green: 0.91, blue: 0.72, alpha: 1)
        done.translatesAutoresizingMaskIntoConstraints = false
        done.addTarget(self, action: #selector(finish), for: .touchUpInside)
        view.addSubview(done)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -20),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
            done.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 24),
            done.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            done.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
        ])
        label.text = "…"
        if loadFile({ [weak self] name in
            guard let self = self else { return }
            if let name = name {
                UserDefaults(suiteName: ShareViewController.group)?.set(["file": name, "at": Date().timeIntervalSince1970], forKey: "share")
                self.label.text = self.arabic ? "✓ وصل الملف\nافتح «حياتي» وبتلقاه" : "✓ File received\nOpen Hayati to import it"
            } else {
                self.label.text = self.arabic ? "ما قدرنا ناخذ الملف (الحد 15MB)" : "Couldn't take the file (15MB max)"
            }
        }) { return }
        loadText { [weak self] text in
            guard let self = self else { return }
            if let text = text, !text.isEmpty {
                ShareViewController.save(text)
                self.label.text = self.arabic ? "✓ وصلت الرسالة\nافتح «حياتي» وبتلقاها" : "✓ Message received\nOpen Hayati to add it"
            } else {
                self.label.text = self.arabic ? "ما لقينا نص نقدر نقراه" : "No text we can read"
            }
        }
    }

    static func save(_ text: String) {
        let t = String(text.prefix(maxChars))
        UserDefaults(suiteName: group)?.set(["text": t, "at": Date().timeIntervalSince1970], forKey: "share")
    }

    // ملف من «الملفات» أو الواتساب أو الإيميل: ننسخه وهو مفتوح (الرابط المؤقت يروح بعد الدالة)
    private func loadFile(_ done: @escaping (String?) -> Void) -> Bool {
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        for item in items {
            for p in item.attachments ?? [] where p.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier)
                || (!p.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) && p.hasItemConformingToTypeIdentifier(UTType.data.identifier)) {
                let type = p.registeredTypeIdentifiers.first { UTType($0)?.conforms(to: .data) == true } ?? UTType.data.identifier
                _ = p.loadFileRepresentation(forTypeIdentifier: type) { url, _ in
                    var saved: String?
                    let fm = FileManager.default
                    if let url = url, let dir = fm.containerURL(forSecurityApplicationGroupIdentifier: ShareViewController.group)?.appendingPathComponent("share", isDirectory: true),
                       let size = (try? fm.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue, size <= ShareViewController.maxFile {
                        try? fm.removeItem(at: dir)
                        try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
                        var name = url.lastPathComponent
                        if (name as NSString).pathExtension.isEmpty, let ext = UTType(type)?.preferredFilenameExtension { name += "." + ext }
                        if (try? fm.copyItem(at: url, to: dir.appendingPathComponent(name))) != nil { saved = name }
                    }
                    DispatchQueue.main.async { done(saved) }
                }
                return true
            }
        }
        return false
    }

    private func loadText(_ done: @escaping (String?) -> Void) {
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let type = UTType.plainText.identifier
        for item in items {
            for p in item.attachments ?? [] where p.hasItemConformingToTypeIdentifier(type) {
                p.loadItem(forTypeIdentifier: type, options: nil) { data, _ in
                    var s: String?
                    if let str = data as? String { s = str }
                    else if let d = data as? Data { s = String(data: d, encoding: .utf8) }
                    DispatchQueue.main.async { done(s?.trimmingCharacters(in: .whitespacesAndNewlines)) }
                }
                return
            }
        }
        let fallback = items.compactMap { $0.attributedContentText?.string }.first
        done(fallback?.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    @objc private func finish() { extensionContext?.completeRequest(returningItems: nil) }
}
