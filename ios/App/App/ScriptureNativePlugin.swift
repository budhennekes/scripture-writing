import Capacitor
import Foundation
import PencilKit
import UIKit
import WidgetKit

private enum ScriptureAppGroup {
    static let identifier = "group.com.scripturebyhand.app"
    static let widgetKind = "ScriptureVerseWidget"
}

@objc(ScriptureNativePlugin)
public final class ScriptureNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScriptureNativePlugin"
    public let jsName = "ScriptureNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openHandwriting", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWidget", returnType: CAPPluginReturnPromise),
    ]

    @objc func openHandwriting(_ call: CAPPluginCall) {
        let reference = call.getString("reference") ?? "Scripture"
        let verseText = call.getString("text") ?? ""

        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("The writing screen could not be opened.")
                return
            }

            let library = HandwritingLibraryViewController(reference: reference, verseText: verseText)
            library.onClose = { call.resolve(["opened": true]) }
            let navigation = UINavigationController(rootViewController: library)
            navigation.modalPresentationStyle = .fullScreen
            presenter.present(navigation, animated: true)
        }
    }

    @objc func updateWidget(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: ScriptureAppGroup.identifier) else {
            call.reject("The Scripture widget storage is unavailable.")
            return
        }

        defaults.set(call.getString("reference") ?? "Scripture", forKey: "currentReference")
        defaults.set(call.getString("text") ?? "", forKey: "currentVerse")
        defaults.set(Date().timeIntervalSince1970, forKey: "updatedAt")
        WidgetCenter.shared.reloadTimelines(ofKind: ScriptureAppGroup.widgetKind)
        call.resolve()
    }
}

private struct HandwritingEntry: Codable, Identifiable {
    var id: String
    var reference: String
    var verseText: String
    var createdAt: Date
    var drawingData: Data
}

private enum HandwritingStore {
    private static var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("ScriptureByHand/Handwriting", isDirectory: true)
    }

    static func load() -> [HandwritingEntry] {
        guard let files = try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return [] }

        return files.compactMap { url in
            guard url.pathExtension == "json",
                  let data = try? Data(contentsOf: url),
                  let entry = try? JSONDecoder().decode(HandwritingEntry.self, from: data) else { return nil }
            return entry
        }.sorted { $0.createdAt > $1.createdAt }
    }

    static func save(_ entry: HandwritingEntry) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent("\(entry.id).json")
        let data = try JSONEncoder().encode(entry)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }
}

private final class HandwritingLibraryViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {
    private let reference: String
    private let verseText: String
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private var entries: [HandwritingEntry] = []
    var onClose: (() -> Void)?

    init(reference: String, verseText: String) {
        self.reference = reference
        self.verseText = verseText
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "My handwriting"
        view.backgroundColor = UIColor(red: 0.97, green: 0.96, blue: 0.92, alpha: 1)
        navigationController?.navigationBar.prefersLargeTitles = true
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .done,
            target: self,
            action: #selector(close)
        )

        tableView.dataSource = self
        tableView.delegate = self
        tableView.backgroundColor = .clear
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Entry")
        view.addSubview(tableView)
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        let empty = UILabel()
        empty.text = "Your saved pages stay on this device. Start with the verse you’re reading, or reopen a page below."
        empty.textColor = UIColor.secondaryLabel
        empty.font = .systemFont(ofSize: 16)
        empty.numberOfLines = 0
        empty.textAlignment = .center
        empty.frame = CGRect(x: 0, y: 0, width: view.bounds.width - 48, height: 120)
        tableView.backgroundView = empty
        tableView.tableFooterView = UIView()
        refreshEntries()

        let newButton = UIButton(type: .system)
        newButton.setTitle("Write this verse", for: .normal)
        newButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        newButton.backgroundColor = UIColor(red: 0.16, green: 0.25, blue: 0.22, alpha: 1)
        newButton.setTitleColor(.white, for: .normal)
        newButton.layer.cornerRadius = 12
        newButton.translatesAutoresizingMaskIntoConstraints = false
        newButton.addTarget(self, action: #selector(startNewEntry), for: .touchUpInside)
        navigationItem.leftBarButtonItem = UIBarButtonItem(customView: newButton)
        newButton.widthAnchor.constraint(equalToConstant: 148).isActive = true
        newButton.heightAnchor.constraint(equalToConstant: 40).isActive = true
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        refreshEntries()
    }

    private func refreshEntries() {
        entries = HandwritingStore.load()
        tableView.reloadData()
        tableView.backgroundView?.isHidden = !entries.isEmpty
    }

    @objc private func close() {
        dismiss(animated: true) { [onClose] in onClose?() }
    }

    @objc private func startNewEntry() {
        let editor = HandwritingCanvasViewController(reference: reference, verseText: verseText, entry: nil)
        editor.onSave = { [weak self] in self?.refreshEntries() }
        navigationController?.pushViewController(editor, animated: true)
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { entries.count }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "Entry", for: indexPath)
        let entry = entries[indexPath.row]
        var content = cell.defaultContentConfiguration()
        content.text = entry.reference
        content.secondaryText = entry.createdAt.formatted(date: .abbreviated, time: .shortened)
        content.textProperties.font = .systemFont(ofSize: 17, weight: .semibold)
        content.secondaryTextProperties.color = .secondaryLabel
        cell.contentConfiguration = content
        cell.accessoryType = .disclosureIndicator
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let editor = HandwritingCanvasViewController(reference: reference, verseText: verseText, entry: entries[indexPath.row])
        editor.onSave = { [weak self] in self?.refreshEntries() }
        navigationController?.pushViewController(editor, animated: true)
    }
}

private final class HandwritingCanvasViewController: UIViewController, PKCanvasViewDelegate {
    private let reference: String
    private let verseText: String
    private let existingEntry: HandwritingEntry?
    private let canvasView = PKCanvasView()
    private var toolPicker: PKToolPicker?
    var onSave: (() -> Void)?

    init(reference: String, verseText: String, entry: HandwritingEntry?) {
        self.reference = entry?.reference ?? reference
        self.verseText = entry?.verseText ?? verseText
        self.existingEntry = entry
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Write by hand"
        view.backgroundColor = UIColor(red: 0.97, green: 0.96, blue: 0.92, alpha: 1)
        navigationItem.largeTitleDisplayMode = .never
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Save", style: .done, target: self, action: #selector(save))

        let referenceLabel = UILabel()
        referenceLabel.text = reference
        referenceLabel.textColor = UIColor(red: 0.20, green: 0.31, blue: 0.27, alpha: 1)
        referenceLabel.font = .systemFont(ofSize: 14, weight: .semibold)

        let verseLabel = UILabel()
        verseLabel.text = verseText
        verseLabel.textColor = UIColor(red: 0.18, green: 0.18, blue: 0.16, alpha: 1)
        verseLabel.font = .systemFont(ofSize: 20, weight: .regular)
        verseLabel.numberOfLines = 3

        let instructionLabel = UILabel()
        instructionLabel.text = "Write the verse with Apple Pencil or your finger."
        instructionLabel.textColor = .secondaryLabel
        instructionLabel.font = .systemFont(ofSize: 13)

        canvasView.delegate = self
        canvasView.drawingPolicy = .anyInput
        canvasView.backgroundColor = UIColor(red: 1.0, green: 0.995, blue: 0.97, alpha: 1)
        canvasView.layer.cornerRadius = 14
        canvasView.layer.borderWidth = 1
        canvasView.layer.borderColor = UIColor(red: 0.84, green: 0.82, blue: 0.76, alpha: 1).cgColor
        canvasView.clipsToBounds = true
        canvasView.translatesAutoresizingMaskIntoConstraints = false
        if let entry = existingEntry, let drawing = try? PKDrawing(data: entry.drawingData) {
            canvasView.drawing = drawing
        }

        let stack = UIStackView(arrangedSubviews: [referenceLabel, verseLabel, instructionLabel, canvasView])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            canvasView.heightAnchor.constraint(greaterThanOrEqualToConstant: 300),
        ])
        verseLabel.setContentHuggingPriority(.required, for: .vertical)
        instructionLabel.setContentHuggingPriority(.required, for: .vertical)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        let picker = PKToolPicker()
        toolPicker = picker
        picker.addObserver(canvasView)
        picker.setVisible(true, forFirstResponder: canvasView)
        canvasView.becomeFirstResponder()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if let toolPicker { toolPicker.removeObserver(canvasView) }
    }

    @objc private func save() {
        let entry = HandwritingEntry(
            id: existingEntry?.id ?? UUID().uuidString,
            reference: reference,
            verseText: verseText,
            createdAt: existingEntry?.createdAt ?? Date(),
            drawingData: canvasView.drawing.dataRepresentation()
        )
        do {
            try HandwritingStore.save(entry)
            onSave?()
            navigationController?.popViewController(animated: true)
        } catch {
            let alert = UIAlertController(title: "Couldn’t save this page", message: "Your drawing is still open. Please try saving again.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
        }
    }
}
