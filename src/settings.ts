import { App, ColorComponent, DropdownComponent, Notice, PluginSettingTab, Setting, TextComponent, TFile, TFolder } from "obsidian";
import type RhinoPdfExport from "./main";
import type { CustomFont, PdfTheme } from "./types";
import { BUILTIN_THEMES, createBlankTheme, duplicateTheme } from "./themes";
import { isCssLength, isFontFamily, isFontWeight } from "./frontmatter";
import { readFontMetadata } from "./font-meta";
import { FontFileSuggest, FontFolderModal, fontFilesIn, readFontFiles } from "./font-picker";

const PAGE_SIZES = ["A3", "A4", "A5", "Letter", "Legal", "Tabloid"];
const MARGIN_SIDES = ["top", "right", "bottom", "left"] as const;
const FONT_SETTINGS = ["size", "color", "style", "weight", "underline", "transform"];

type Getter<T> = () => T;
type Setter<T> = (value: T) => void;

export class ThemedPdfSettingTab extends PluginSettingTab {
  plugin: RhinoPdfExport;

  constructor(app: App, plugin: RhinoPdfExport) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // --- Setting builders -----------------------------------------------------
  // The editor holds ~30 fields; without these each one is an eight-line block.

  private save(): void {
    void this.plugin.saveSettings();
  }

  private addText(
    c: HTMLElement,
    name: string,
    get: Getter<string>,
    set: Setter<string>,
    opts: { desc?: string; placeholder?: string; cls?: string } = {}
  ): Setting {
    const setting = new Setting(c).setName(name);
    if (opts.desc) setting.setDesc(opts.desc);
    if (opts.cls) setting.setClass(opts.cls);
    setting.addText((t) => {
      if (opts.placeholder) t.setPlaceholder(opts.placeholder);
      t.setValue(get()).onChange((v) => {
        set(v);
        this.save();
      });
    });
    return setting;
  }

  /** A CSS length input that flags an unusable value instead of dropping it. */
  private addLength(
    c: HTMLElement,
    name: string,
    get: Getter<string>,
    set: Setter<string>,
    opts: { desc?: string } = {}
  ): Setting {
    const setting = new Setting(c).setName(name);
    if (opts.desc) setting.setDesc(opts.desc);
    setting.addText((t) => {
      t.setPlaceholder("CSS length");
      t.setValue(get()).onChange((v) => {
        const valid = isCssLength(v);
        t.inputEl.toggleClass("rhino-invalid", !valid);
        if (!valid) return;
        set(v.trim());
        this.save();
      });
    });
    return setting;
  }

  private addTextArea(
    c: HTMLElement,
    name: string,
    get: Getter<string>,
    set: Setter<string>,
    opts: { desc?: string; rows?: number } = {}
  ): Setting {
    const setting = new Setting(c).setName(name).setClass("rhino-textarea-wide");
    if (opts.desc) setting.setDesc(opts.desc);
    setting.addTextArea((t) => {
      t.setValue(get()).onChange((v) => {
        set(v);
        this.save();
      });
      t.inputEl.rows = opts.rows ?? 6;
    });
    return setting;
  }

  private addColor(
    c: HTMLElement,
    name: string,
    get: Getter<string>,
    set: Setter<string>,
    opts: { desc?: string } = {}
  ): Setting {
    const setting = new Setting(c).setName(name);
    if (opts.desc) setting.setDesc(opts.desc);
    setting.addText((t: TextComponent) => {
      t.inputEl.type = "color";
      t.setValue(get()).onChange((v) => {
        set(v);
        this.save();
      });
    });
    return setting;
  }

  private addToggle(
    c: HTMLElement,
    name: string,
    get: Getter<boolean>,
    set: Setter<boolean>,
    opts: { desc?: string } = {}
  ): Setting {
    const setting = new Setting(c).setName(name);
    if (opts.desc) setting.setDesc(opts.desc);
    setting.addToggle((t) => {
      t.setValue(get()).onChange((v) => {
        set(v);
        this.save();
      });
    });
    return setting;
  }

  private addSlider(
    c: HTMLElement,
    name: string,
    get: Getter<number>,
    set: Setter<number>,
    limits: { min: number; max: number; step: number },
    opts: { desc?: string } = {}
  ): Setting {
    const setting = new Setting(c).setName(name);
    if (opts.desc) setting.setDesc(opts.desc);
    setting.addSlider((s) => {
      s.setLimits(limits.min, limits.max, limits.step)
        .setValue(get())
        .setDynamicTooltip()
        .onChange((v) => {
          set(v);
          this.save();
        });
    });
    return setting;
  }

  private addDropdown(
    c: HTMLElement,
    name: string,
    choices: [string, string][],
    get: Getter<string>,
    set: Setter<string>,
    opts: { desc?: string } = {}
  ): Setting {
    const setting = new Setting(c).setName(name);
    if (opts.desc) setting.setDesc(opts.desc);
    setting.addDropdown((dd) => {
      for (const [value, label] of choices) dd.addOption(value, label);
      dd.setValue(get()).onChange((v) => {
        set(v);
        this.save();
      });
    });
    return setting;
  }

  // --- Theme list -----------------------------------------------------------

  /** Re-render the tab after a theme is added, duplicated, deleted or imported. */
  private refresh(): void {
    this.display();
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("PDF export").setHeading();

    new Setting(containerEl).setName("Built-in themes").setHeading();
    for (const theme of BUILTIN_THEMES) {
      this.renderThemeRow(containerEl, theme, true);
    }

    new Setting(containerEl).setName("Custom themes").setHeading();

    if (this.plugin.settings.themes.length === 0) {
      containerEl.createEl("p", {
        text: "No custom themes yet. Duplicate a built-in theme to start from it.",
        cls: "setting-item-description",
      });
    }

    for (const theme of this.plugin.settings.themes) {
      this.renderThemeRow(containerEl, theme, false);
    }

    new Setting(containerEl)
      .addButton((btn) => {
        btn.setButtonText("New theme").onClick(async () => {
          const newTheme = createBlankTheme();
          this.plugin.settings.themes.push(newTheme);
          await this.plugin.saveSettings();
          this.refresh();
        });
      })
      .addButton((btn) => {
        btn.setButtonText("Import JSON").onClick(() => {
          this.importThemeFromJson();
        });
      });
  }

  private renderThemeRow(containerEl: HTMLElement, theme: PdfTheme, isBuiltin: boolean) {
    const row = new Setting(containerEl)
      .setName(theme.name)
      .setDesc(
        `${theme.primaryColor} / ${theme.accentColor}` +
          (theme.showCover ? " · cover" : "") +
          (theme.showLegal ? " · legal notice" : "")
      );

    const colorPreview = createSpan({ cls: "theme-colors-preview" });
    const swatch1 = colorPreview.createSpan({ cls: "rhino-color-swatch" });
    swatch1.setCssStyles({ backgroundColor: theme.primaryColor });
    const swatch2 = colorPreview.createSpan({ cls: "rhino-color-swatch" });
    swatch2.setCssStyles({ backgroundColor: theme.accentColor });
    row.nameEl.prepend(colorPreview);

    row.addButton((btn) => {
      btn.setIcon("download").setTooltip("Export as JSON").onClick(() => {
        this.exportThemeToJson(theme);
      });
    });

    // Available on built-ins too: starting from one used to mean retyping it.
    row.addButton((btn) => {
      btn.setIcon("copy").setTooltip("Duplicate").onClick(async () => {
        const copy = duplicateTheme(theme);
        this.plugin.settings.themes.push(copy);
        await this.plugin.saveSettings();
        new Notice(`Theme duplicated as "${copy.name}".`);
        this.refresh();
      });
    });

    if (!isBuiltin) {
      row.addButton((btn) => {
        btn.setButtonText("Edit").onClick(() => {
          this.openThemeEditor(theme);
        });
      });
      row.addButton((btn) => {
        btn.setIcon("trash").setWarning().onClick(async () => {
          this.plugin.settings.themes = this.plugin.settings.themes.filter(
            (t) => t.id !== theme.id
          );
          await this.plugin.saveSettings();
          this.refresh();
        });
      });
    }
  }

  // --- Theme editor ---------------------------------------------------------
  // Sections follow the order things appear in the document.

  private openThemeEditor(theme: PdfTheme) {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(`Edit: ${theme.name}`).setHeading();
    new Setting(containerEl).addButton((btn) => {
      btn.setButtonText("Back").onClick(() => this.refresh());
    });

    this.addText(containerEl, "Theme name", () => theme.name, (v) => { theme.name = v; });
    this.addColor(containerEl, "Primary color", () => theme.primaryColor, (v) => { theme.primaryColor = v; });
    this.addColor(containerEl, "Accent color", () => theme.accentColor, (v) => { theme.accentColor = v; });
    
    
    
    /* this.addText(containerEl, "Logo", () => theme.logoPath, (v) => { theme.logoPath = v.trim(); }, {
      desc: "Relative path in vault (e.g. assets/logo.png)",
      placeholder: "assets/logo.png",
    });*/
    this.addText(containerEl, "Background", () => theme.backgroundPath, (v) => { theme.backgroundPath = v.trim(); }, {
      desc: "Relative path in vault (e.g. assets/background.png)\nuse pictures in with the same form-factor of the document-format.\nThis Setting overwrites Logos!!!",
      placeholder: "assets/background.png",
    });

    this.renderPageSection(containerEl, theme);
    this.renderCustomFonts(containerEl, theme);
    this.renderMainTypographySection(containerEl, theme);
    this.renderCoverSection(containerEl, theme);
    this.renderLegalSection(containerEl, theme);
    this.renderTocSection(containerEl, theme);
    this.renderAdditionalIndexes(containerEl, theme);
    this.renderHeaderFooterSection(containerEl, theme);
    this.renderProtocolLookAndFeelSection(containerEl, theme);
    this.renderWatermarkSection(containerEl, theme);
    this.renderClassificationSection(containerEl, theme);
    this.renderMetadataSection(containerEl, theme);
  }
  
  
  private renderPageSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Page layout").setHeading();

    this.addDropdown(c, "Page size", PAGE_SIZES.map((s) => [s, s]), () => theme.pageSize, (v) => { theme.pageSize = v; });
    this.addDropdown(
      c,
      "Orientation",
      [["portrait", "Portrait"], ["landscape", "Landscape"]],
      () => theme.orientation || "portrait",
      (v) => { theme.orientation = v as PdfTheme["orientation"]; }
    );

    // One input per side: a single comma-separated field silently discarded
    // anything that did not split into exactly four parts.
    const margins = new Setting(c)
      .setName("Margins")
      .setDesc("Top, right, bottom, left, in CSS length units")
      .setClass("rhino-margins-row");
    for (const side of MARGIN_SIDES) {
      margins.addText((t) => {
        t.setPlaceholder(side);
        t.setValue(theme.margins[side]).onChange((v) => {
          const valid = isCssLength(v);
          t.inputEl.toggleClass("rhino-invalid", !valid);
          if (!valid) return;
          theme.margins[side] = v.trim();
          this.save();
        });
      });
    }
  }
  
  
  private renderMainTypographySection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Main Typography").setHeading();
    c.createEl("p", {
      text:
        "This section allows you to configure settings for the basic typographic elements." +
        "This includes the default font, font size, and other attributes. " +
        "It also provides options for customizing the appearance of links and headings.",
      cls: "setting-item-description",
    });
    
    this.addText(c, "Document font family", () => theme.bodyFont, (v) => { theme.bodyFont = v; }, {
      desc: "CSS font stack, e.g. 'Inter', sans-serif. Inter and JetBrains Mono are bundled.",
    }); 
    this.addElementStylingRow(c, theme, "Font-format for plain-text in the whole document", "bodyFontSize", "", "bodyFontStyle", "bodyFontWeight");
    this.addElementStylingRow(c, theme, "Font-format for links in plain-text", "", "linkFontColor", "linkFontStyle", "linkFontWeight", "linkFontUnderline");
    this.addText(c, "Code font", () => theme.codeFont, (v) => { theme.codeFont = v; });
    
    
    /**
     *
     * Setting for Header 
     *
     **/
     new Setting(c).setName("Headings & page breaks").setHeading();
    c.createEl("p", {
      text: "Start a new page before each heading of the selected level(s). " + 
          "The cover and table of contents are never affected." + 
          "The setting for h1 is generally only needed when several documents are " + 
          "to be combined into one document. " + 
          "Individual documents are structured using the headings h2-h5.",
      cls: "setting-item-description",
    });
    this.addToggle(c, "Before heading 1", () => theme.pageBreakBeforeH1, (v) => { theme.pageBreakBeforeH1 = v; });
    this.addElementStylingRow(c, theme, "Font-format for 1st-level-headers (used in case of ", "h1FontSize", "h1FontColor", "h1FontStyle", "h1FontWeight");  
    this.addToggle(c, "Before heading 2", () => theme.pageBreakBeforeH2, (v) => { theme.pageBreakBeforeH2 = v; });
    this.addElementStylingRow(c, theme, "Font-format for 2nd-level-headers", "h2FontSize", "h2FontColor", "h2FontStyle", "h2FontWeight");
    this.addToggle(c, "Before heading 3", () => theme.pageBreakBeforeH3, (v) => { theme.pageBreakBeforeH3 = v; });
    this.addElementStylingRow(c, theme, "Font-format for 3rd-level-headers", "h3FontSize", "h3FontColor", "h3FontStyle", "h3FontWeight");
    this.addElementStylingRow(c, theme, "Font-format for 4th-level-headers", "h4FontSize", "h4FontColor", "h4FontStyle", "h4FontWeight");
    this.addElementStylingRow(c, theme, "Font-format for 5th-level-headers", "h5FontSize", "h5FontColor", "h5FontStyle", "h5FontWeight"); 
    this.addElementStylingRow(c, theme, "Font-format for 6th-level-headers (picture & table caption in combination with \"Caption Numbering\"-plugin)", "h6FontSize", "h6FontColor", "h6FontStyle", "h6FontWeight"); 
  }



  /**
   * Font files embedded from the vault. Without them a font must be installed on
   * whichever machine runs the export, and a missing one falls back silently.
   */
  private renderCustomFonts(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Embedded fonts").setHeading();
    c.createEl("p", {
      text:
        "Embed font files stored in your vault (woff2, woff, ttf, otf), so exports look the " +
        "same everywhere and work offline. Pick a file and its family, weight and style are " +
        "read from it. Add one row per weight: without a real bold file, the renderer fakes " +
        "one. Then use the family name in the font fields above.",
      cls: "setting-item-description",
    });

    theme.customFonts.forEach((font, index) => {
      const row = new Setting(c).setClass("rhino-font-row");

      let familyInput: TextComponent;
      let weightInput: TextComponent;
      let styleDropdown: DropdownComponent;

      row.addText((t) => {
        familyInput = t;
        t.setPlaceholder("Family").setValue(font.family).onChange((v) => {
          t.inputEl.toggleClass("rhino-invalid", v.trim() !== "" && !isFontFamily(v));
          font.family = v.trim();
          this.save();
        });
      });

      row.addText((t) => {
        t.setPlaceholder("Font file path")
          .setValue(font.path)
          .onChange((v) => {
            font.path = v.trim();
            this.save();
          });
        t.inputEl.addClass("rhino-font-path");

        new FontFileSuggest(this.app, t.inputEl, (file) => {
          void this.fillFromFontFile(file, font, familyInput, weightInput, styleDropdown);
        });
      });

      row.addText((t) => {
        weightInput = t;
        t.setPlaceholder("400").setValue(font.weight).onChange((v) => {
          t.inputEl.toggleClass("rhino-invalid", v.trim() !== "" && !isFontWeight(v));
          font.weight = v.trim();
          this.save();
        });
        t.inputEl.addClass("rhino-font-weight");
      });

      row.addDropdown((dd) => {
        styleDropdown = dd;
        dd.addOption("normal", "Normal");
        dd.addOption("italic", "Italic");
        dd.setValue(font.style).onChange((v) => {
          font.style = v as CustomFont["style"];
          this.save();
        });
      });

      row.addExtraButton((btn) => {
        btn.setIcon("trash").setTooltip("Remove").onClick(async () => {
          theme.customFonts.splice(index, 1);
          await this.plugin.saveSettings();
          this.openThemeEditor(theme);
        });
      });
    });

    new Setting(c)
      .addButton((btn) => {
        btn.setButtonText("Add font file").onClick(async () => {
          theme.customFonts.push({ family: "", path: "", weight: "400", style: "normal" });
          await this.plugin.saveSettings();
          this.openThemeEditor(theme);
        });
      })
      .addButton((btn) => {
        btn.setButtonText("Import from folder").onClick(() => {
          new FontFolderModal(this.app, (folder) => {
            void this.importFontsFromFolder(folder, theme);
          }).open();
        });
      });
  }

  /** Fill in family/weight/style from the chosen file's own metadata. */
  private async fillFromFontFile(
    file: TFile,
    font: CustomFont,
    familyInput: TextComponent,
    weightInput: TextComponent,
    styleDropdown: DropdownComponent
  ) {
    font.path = file.path;
    const metadata = readFontMetadata(await this.app.vault.readBinary(file));
    if (!metadata) {
      new Notice(`Could not read font metadata from ${file.name}. Fill the fields manually.`);
      await this.plugin.saveSettings();
      return;
    }

    font.family = metadata.family;
    font.weight = metadata.weight;
    font.style = metadata.style;

    familyInput.setValue(metadata.family);
    familyInput.inputEl.toggleClass("rhino-invalid", !isFontFamily(metadata.family));
    weightInput.setValue(metadata.weight);
    weightInput.inputEl.toggleClass("rhino-invalid", !isFontWeight(metadata.weight));
    styleDropdown.setValue(metadata.style);

    await this.plugin.saveSettings();
  }

  /** Add one row per readable font file in the folder, skipping known paths. */
  private async importFontsFromFolder(folder: TFolder, theme: PdfTheme) {
    const files = fontFilesIn(folder);
    const known = new Set(theme.customFonts.map((f) => f.path));
    const results = await readFontFiles(this.app, files.filter((f) => !known.has(f.path)));

    const added: CustomFont[] = [];
    const skipped: string[] = [];
    for (const { file, metadata } of results) {
      if (!metadata || !isFontFamily(metadata.family) || !isFontWeight(metadata.weight)) {
        skipped.push(file.name);
        continue;
      }
      added.push({
        family: metadata.family,
        path: file.path,
        weight: metadata.weight,
        style: metadata.style,
      });
    }

    if (added.length === 0 && skipped.length === 0) {
      new Notice("No new font files in that folder.");
      return;
    }

    added.sort(
      (a, b) =>
        a.family.localeCompare(b.family) ||
        parseInt(a.weight) - parseInt(b.weight) ||
        a.style.localeCompare(b.style)
    );
    theme.customFonts.push(...added);
    await this.plugin.saveSettings();

    const parts = [`${added.length} font${added.length > 1 ? "s" : ""} added`];
    if (skipped.length > 0) parts.push(`${skipped.length} skipped: ${skipped.join(", ")}`);
    new Notice(parts.join(" — "));
    this.openThemeEditor(theme);
  }

  private renderCoverSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Cover and contents").setHeading();
    c.createEl("p", {
      text:
        "This section allows you to configure the cover design. " + 
        "Once the cover page is activated, the settings for the background image, " + 
        "header, and footer will only take effect from the second page onward. " + 
        "The header and footer are not displayed on the cover page. " + 
        "If you want a background image on the cover page, you must explicitly " + 
        "specify this in this section.",
      cls: "setting-item-description",
    });

    this.addToggle(c, "Show cover page", () => theme.showCover, (v) => { theme.showCover = v; });
    this.addToggle(c, "Dedicated cover Page", () => theme.dedicatedCover, (v) => { theme.dedicatedCover = v; }, {
      desc: "inserts a page-break after the cover page. If this setting is not set, the content of the document will be inserted directly after the configured content of the cover page.",
    });

    this.addText(c, "Title", () => theme.title, (v) => { theme.title = v; });
    this.addElementStylingRow(c, theme, "Font-format for title-text", "titleFontSize", "titleFontColor", "titleFontStyle", "titleFontWeight");

    this.addText(c, "Subtitle", () => theme.subtitle, (v) => { theme.subtitle = v; });
    this.addElementStylingRow(c, theme, "Font-format for subtitle-text", "subtitleFontSize", "subtitleFontColor", "subtitleFontStyle", "subtitleFontWeight");

    this.addText(c, "Additional Content (sub-subtitle)", () => theme.additionalContent, (v) => { theme.additionalContent = v; }, {
      desc: "Additional content on the front page",
    });
    this.addElementStylingRow(c, theme, "Font-format for additional-content-text", "additionalContentFontSize", "additionalContentFontColor", "additionalContentFontStyle", "additionalContentFontWeight");

    
    this.addText(c, "Cover Background", () => theme.coverBackgroundPath, (v) => { theme.coverBackgroundPath = v.trim(); }, {
      desc: "Relative path in vault (e.g. assets/background.png)\nuse pictures in with the same form-factor of the document-format",
      placeholder: "assets/background.png",
    });
    this.addText(c, "Cover Image", () => theme.coverImagePath, (v) => { theme.coverImagePath = v.trim(); }, {
      desc: "An image, wich wwill be shown on the cover page after title, subtitle an additional content. If a cover info block hab been configured, this setting will override the cover info block. Relative path in vault (e.g. assets/coverImage.png)",
      placeholder: "assets/coverImage.png",
    });
    
    this.addText(
      c,
      "Cover info block",
      () => theme.coverInfoFields.join(", "),
      (v) => {
        theme.coverInfoFields = v.split(",").map((s) => s.trim()).filter(Boolean);
      },
      {
        desc: "Frontmatter keys listed on the cover by default, comma-separated (e.g. author, date)",
        placeholder: "author, date",
      }
    );
  }
    
  
  private renderTocSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Table of contents").setHeading();
    c.createEl("p", {
      text:
        "This section allows you to configure the table of content.",
      cls: "setting-item-description",
    });  
    this.addToggle(c, "Table of contents", () => theme.showToc, (v) => { theme.showToc = v; }, {
      desc: "Auto-generated from H2/H3/H4 headings, after the cover page",
    });
    this.addText(c, "Table of contents title", () => theme.tocTitle, (v) => { theme.tocTitle = v; });
    this.addToggle(c, "Number headings", () => theme.numberHeadings, (v) => { theme.numberHeadings = v; }, {
      desc: "Automatically number H2/H3/H4 headings (1, 1.1, …), synced with the table of contents",
    });
    this.addElementStylingRow(c, theme, "Font-format for the 1st-level toc-entry (H2)", "tocH2FontSize", "tocH2FontColor", "tocH2FontStyle", "tocH2FontWeight");
    this.addIndexIndent(c, theme, "Indent of the 1st-level toc-entry", "tocH2Indent", "tocH2ListIndexWidth")
    this.addElementStylingRow(c, theme, "Font-format for the 2nd-level toc-entry (H3)", "tocH3FontSize", "tocH3FontColor", "tocH3FontStyle", "tocH3FontWeight");
    this.addIndexIndent(c, theme, "Indent of the 2nd-level toc-entry", "tocH3Indent", "tocH3ListIndexWidth")
    this.addElementStylingRow(c, theme, "Font-format for the 3rd-level toc-entry (H4)", "tocH4FontSize", "tocH4FontColor", "tocH4FontStyle", "tocH4FontWeight");
    this.addIndexIndent(c, theme, "Indent of the 3rd-level toc-entry", "tocH4Indent", "tocH4ListIndexWidth")
  }
  
  private renderAdditionalIndexes(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Additional indexes (list of figures / list of tables)").setHeading();
    c.createEl("p", {
      text:
        "This section allows you to configure the list of figures / list of tables.",
      cls: "setting-item-description",
    });  

    this.addToggle(c, "List of figures", () => theme.showLof, (v) => { theme.showLof = v; }, {
      desc: "Auto-generated from H6 headings starting with the configured keyword, after the table of content",
    });
    this.addText(c, "List of figures title", () => theme.lofTitle, (v) => { theme.lofTitle = v; });
    this.addText(c, "List of figures keyword", () => theme.lofKeyword, (v) => { theme.lofKeyword = v; });
    this.addElementStylingRow(c, theme, "Font-format for the List of figures-entry", "lofFontSize", "lofFontColor", "lofFontStyle", "lofFontWeight");
    this.addIndexIndent(c, theme, "Indent of the \"list of figures\"-entry", "lofIndent", "lofListIndexWidth");


    this.addToggle(c, "List of tables", () => theme.showLot, (v) => { theme.showLot = v; }, {
      desc: "Auto-generated from H6 headings starting with the configured keyword, after the table of content",
    });
    this.addText(c, "List of tables title", () => theme.lotTitle, (v) => { theme.lotTitle = v; });
    this.addText(c, "List of tables keyword", () => theme.lotKeyword, (v) => { theme.lotKeyword = v; });
    this.addElementStylingRow(c, theme, "Font-format for the List of tables-entry", "lotFontSize", "lotFontColor", "lotFontStyle", "lotFontWeight");
    this.addIndexIndent(c, theme, "Indent of the \"list of tables\"-entry", "lotIndent", "lotListIndexWidth");
  }
  
  private renderProtocolLookAndFeelSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Protocoll-like look & feel").setHeading();
    c.createEl("p", {
      text:
        "This section allows you to configure the design of the exported document like " +
        "a protocoll (meeting-note). " + 
        "This settings overwrites the cover, toc, an legal informations settings." + 
        "Only the background image setting from the cover-section will be taken." + 
        "On the first page there will be shon the configured Informations in a table. " +
        "Every H2-heading and the folling content will be put in a bordered section (table-like).",
      cls: "setting-item-description",
    });
    this.addToggle(c, "Protocol-like cover & document-style", () => theme.protocolLike, (v) => { theme.protocolLike = v; });
    this.addText(c, "Protocol title", () => theme.protocolTitle, (v) => { theme.protocolTitle = v.trim(); }, {
      desc: "Title auf the protocol",
      placeholder: "{fm.title}",
    });
    
    this.addLabelOutputRow(c, theme, "Creator of the protocol", "protocolCreatorText", "protocolCreatorValue");
    this.addLabelOutputRow(c, theme, "Client of the meeting", "protocolClientText", "protocolClientValue");
    this.addLabelOutputRow(c, theme, "Client-participants of the meeting", "protocolClientParticipantText", "protocolClientParticipantValue");
    this.addLabelOutputRow(c, theme, "Contractor of the meeting", "protocolContractorText", "protocolContractorValue");
    this.addLabelOutputRow(c, theme, "Contractor-participants of the meeting", "protocolContractorParticipantText", "protocolContractorParticipantValue");
    this.addLabelOutputRow(c, theme, "Date of the meeting", "protocolDateText", "protocolDateValue");
    this.addLabelOutputRow(c, theme, "Location of the meeting", "protocolLocationText", "protocolLocationValue");
  }

  private renderHeaderFooterSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Header and footer").setHeading();

    const vars = "Variables: {title}, {filename}, {author}, {date}, {time}, {fm.key}";
    this.addToggle(c, "Header on first page", () => theme.showHeaderOn1stPage, (v) => { theme.showHeaderOn1stPage = v; });
    this.addToggle(c, "Footer on first page", () => theme.showFooterOn1stPage, (v) => { theme.showFooterOn1stPage = v; });

    this.addToggle(c, "Header logo (page 2+)", () => theme.showHeaderLogo, (v) => { theme.showHeaderLogo = v; });
    this.addLength(c, "Header logo height", () => theme.headerLogoHeight, (v) => { theme.headerLogoHeight = v; });

    this.addText(c, "Header-text (line 1)", () => theme.headerText, (v) => { theme.headerText = v; }, {
      desc: vars,
      placeholder: "{title}",
    });
    this.addElementStylingRow(c, theme, "Font-format for header-text (line 1)", "header1FontSize", "header1FontColor", "header1FontStyle", "header1FontWeight");
    
    this.addText(c, "Header-text (line 2)", () => theme.headerText2, (v) => { theme.headerText2 = v; }, {
      desc: vars,
      placeholder: "{subtitle}",
    });
    this.addElementStylingRow(c, theme, "Font-format for header-text (line 2)", "header2FontSize", "header2FontColor", "header2FontStyle", "header2FontWeight");

    this.addToggle(c, "Pagination", () => theme.showPagination, (v) => { theme.showPagination = v; });
    this.addText(c, "Pagination format", () => theme.paginationFormat, (v) => { theme.paginationFormat = v; }, {
      desc: 'Use {page} and {pages}, e.g. "{page} / {pages}" or "Page {page} of {pages}"',
    });
    this.addElementStylingRow(c, theme, "Font-format for pagination", "paginationFontSize", "paginationFontColor", "paginationFontStyle", "paginationFontWeight");
    
    this.addText(c, "Footer text", () => theme.footerText, (v) => { theme.footerText = v; }, { desc: vars });
    this.addElementStylingRow(c, theme, "Font-format for footer-text", "footerFontSize", "footerFontColor", "footerFontStyle", "footerFontWeight");
    
    this.addDropdown(
      c,
      "External links",
      [["off", "Keep as links"], ["inline", "Show inline"], ["footnote", "As footnote"]],
      () => theme.urlDisplay,
      (v) => { theme.urlDisplay = v as PdfTheme["urlDisplay"]; },
      { desc: "How to display the address of external links in the PDF" }
    );
  }

  private renderWatermarkSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Watermark").setHeading();

    this.addText(c, "Watermark text", () => theme.watermarkText, (v) => { theme.watermarkText = v; }, {
      desc: "Leave empty to disable",
      placeholder: "DRAFT",
    });
    this.addElementStylingRow(c, theme, "Font-format for the Watermark", "watermarkFontSize", "watermarkColor", "watermarkFontStyle", "watermarkFontWeight");
    this.addSlider(
      c,
      "Watermark opacity",
      () => theme.watermarkOpacity,
      (v) => { theme.watermarkOpacity = v; },
      { min: 0, max: 1, step: 0.01 }
    );
    this.addSlider(
      c,
      "Watermark rotation",
      () => theme.watermarkRotation,
      (v) => { theme.watermarkRotation = v; },
      { min: -90, max: 90, step: 1 },
      { desc: "In degrees" }
    );
  }

  private renderClassificationSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Classification banner").setHeading();

    this.addText(c, "Classification text", () => theme.classificationText, (v) => { theme.classificationText = v; }, {
      desc: "Centered on every page (incl. cover). Leave empty to disable. Variables: {title}, {filename}, {author}, {date}, {time}, {fm.key}.",
      placeholder: "RESTRICTED",
    });
    this.addColor(c, "Classification color", () => theme.classificationColor, (v) => { theme.classificationColor = v; });
  }

  private renderLegalSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Legal notice / Impressum").setHeading();

    this.addToggle(c, "Legal notice", () => theme.showLegal, (v) => { theme.showLegal = v; });
    this.addText(c, "Legal notice title", () => theme.legalTitle, (v) => { theme.legalTitle = v; });
    this.addTextArea(c, "Legal notice text", () => theme.legalText, (v) => { theme.legalText = v; });
    
    
    this.addText(c, "Legal editor ", () => theme.legalEditor, (v) => { theme.legalEditor = v; }, {
      desc: "Header of the legal editor section.",
    });
    this.addText(c, "Legal Company", () => theme.legalCompany, (v) => { theme.legalCompany = v; });
    this.addElementStylingRow(c, theme, "Font-format for legal company", "legalCompanyFontSize", "legalCompanyFontColor", "legalCompanyFontStyle", "legalCompanyFontWeight", "legalCompanyUnderline", "legalCompanyTransform");
    this.addText(c, "Legal Department (Main)", () => theme.legalDepartment1, (v) => { theme.legalDepartment1 = v; });
    this.addElementStylingRow(c, theme, "Font-format for legal department (main)", "legalDepartment1FontSize", "legalDepartment1FontColor", "legalDepartment1FontStyle", "legalDepartment1FontWeight", "legalDepartment1Underline", "legalDepartment1Transform");
    this.addText(c, "Legal Department (Sub)", () => theme.legalDepartment2, (v) => { theme.legalDepartment2 = v; });
    this.addElementStylingRow(c, theme, "Font-format for legal department (sub)", "legalDepartment2FontSize", "legalDepartment2FontColor", "legalDepartment2FontStyle", "legalDepartment2FontWeight", "legalDepartment2Underline", "legalDepartment2Transform");
    this.addText(c, "Legal Department Street", () => theme.legalStreet, (v) => { theme.legalStreet = v; });
    this.addElementStylingRow(c, theme, "Font-format for legal department street", "legalStreetFontSize", "legalStreetFontColor", "legalStreetFontStyle", "legalStreetFontWeight", "legalStreetUnderline", "legalStreetTransform");
    this.addText(c, "Legal Department City", () => theme.legalCity, (v) => { theme.legalCity = v; });
    this.addElementStylingRow(c, theme, "Font-format for legal department city", "legalCityFontSize", "legalCityFontColor", "legalCityFontStyle", "legalCityFontWeight", "legalCityUnderline", "legalCityTransform");
    this.addText(c, "Legal Department Telephone", () => theme.legalTelephone, (v) => { theme.legalTelephone = v; });
    this.addElementStylingRow(c, theme, "Font-format for legal department telephone", "legalTelephoneFontSize", "legalTelephoneFontColor", "legalTelephoneFontStyle", "legalTelephoneFontWeight", "legalTelephoneUnderline", "legalTelephoneTransform");
    this.addText(c, "Legal Department E-Mail", () => theme.legalMail, (v) => { theme.legalMail = v; });
    this.addElementStylingRow(c, theme, "Font-format for legal department mail", "legalMailFontSize", "legalMailFontColor", "legalMailFontStyle", "legalMailFontWeight", "legalMailUnderline", "legalMailTransform");
    this.addText(c, "Legal Department Link", () => theme.legalWebLink, (v) => { theme.legalWebLink = v; });
    this.addElementStylingRow(c, theme, "Font-format for legal department link", "legalWebLinkFontSize", "legalWebLinkFontColor", "legalWebLinkFontStyle", "legalWebLinkFontWeight", "legalWebLinkUnderline", "legalWebLinkTransform");
    this.addText(c, "Legal Department Link (Alt-Text)", () => theme.legalWebLinkAlt, (v) => { theme.legalWebLinkAlt = v; });
    
    this.addLabelOutputRow(c, theme, "Legal editorial", "legalEditorialText", "legalEditorial");
    this.addLabelOutputRow(c, theme, "Legal author", "legalAuthorText", "legalAuthor");
    this.addLabelOutputRow(c, theme, "Legal photo credit", "legalPhotoCreditText", "legalPhotoCredit");
  }

  private renderMetadataSection(c: HTMLElement, theme: PdfTheme) {
    new Setting(c).setName("Document properties").setHeading();

    this.addToggle(c, "PDF metadata", () => theme.includeMetadata, (v) => { theme.includeMetadata = v; }, {
      desc: "Write title/author/subject/keywords into the PDF properties (from frontmatter)",
    });
  }

  // --- Import / export ------------------------------------------------------

  private exportThemeToJson(theme: PdfTheme) {
    const exportData: Record<string, unknown> = { ...theme };
    delete exportData.builtin;

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = createEl("a");
    a.href = url;
    a.download = `${theme.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private importThemeFromJson() {
    const input = createEl("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;

      void file.text().then((text) => {
        try {
          const data = JSON.parse(text) as Record<string, unknown>;

          if (!data.name || !data.primaryColor) {
            new Notice("Invalid theme JSON: missing name or primary color.");
            return;
          }

          const blank = createBlankTheme();
          const imported: PdfTheme = {
            ...blank,
            ...(data as Partial<PdfTheme>),
            id: "custom-" + Date.now(),
            margins: { ...blank.margins, ...((data.margins as Record<string, string>) || {}) },
            coverInfoFields: Array.isArray(data.coverInfoFields)
              ? (data.coverInfoFields as unknown[]).map(String)
              : [],
            customFonts: Array.isArray(data.customFonts)
              ? (data.customFonts as CustomFont[])
              : [],
          };
          delete (imported as unknown as Record<string, unknown>).builtin;

          this.plugin.settings.themes.push(imported);
          void this.plugin.saveSettings().then(() => {
            this.refresh();
            new Notice(`Theme "${imported.name}" imported.`);
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          new Notice(`Import error: ${message}`);
        }
      });
    });
    input.click();
  }

  private addLabelOutputRow(c: HTMLElement, theme: PdfTheme, caption: string, label: string, output: string) {
    const row = new Setting(c)
      .setName(caption) 
      .setDesc("text of the label & output behind the label")
      .setClass("rhino-margins-row-double");
    
    
    row.addText((t) => {
      t.setPlaceholder("text of the label")
      t.setValue(theme[label])
      t.onChange(async (v) => {
        theme[label] = v.trim();
        this.save();
      });
    });
    
    row.addText((t) => {
      t.setPlaceholder("output behind the label")
      t.setValue(theme[output])
      t.onChange(async (v) => {
        theme[output] = v.trim();
        this.save();
      });
    });
  }

  private addIndexIndent(c: HTMLElement, theme: PdfTheme, caption: string, indent: string, width: string) {
    const row = new Setting(c)
      .setName(caption) 
      .setDesc("Indent of the entry & width of the index-number")
      .setClass("rhino-margins-row-double");
    
    
    row.addText((t) => {
      t.setPlaceholder("0px")
      t.setValue(theme[indent])
      t.onChange(async (v) => {
        theme[indent] = v.trim();
        this.save();
      });
    });
    
    row.addText((t) => {
      t.setPlaceholder("30px")
      t.setValue(theme[width])
      t.onChange(async (v) => {
        theme[width] = v.trim();
        this.save();
      });
    });
  }

  private addElementStylingRow(c: HTMLElement, theme: PdfTheme, captionFontSetting: string, fontSize: string, fontColor: string, fontStyle: string, fontWeight: string, fontUnderline = "", fontTransform = "") {
    let description = "";
    
    description = fontSize != "" ? "size" : "";
    description = fontColor != "" ? (description != "" ? description + ", color" : "color") : description + "";
    description = fontStyle != "" ? (description != "" ? description + ", style" : "style") : description + "";
    description = fontWeight != "" ? (description != "" ? description + ", weight" : "weight") : description + ""; 
    description = fontUnderline != "" ? (description != "" ? description + ", underline" : "underline") : description + ""; 
    description = fontTransform != "" ? (description != "" ? description + ", text-transform" : "text-transform") : description + ""; 

    const fontSetting = new Setting(c)
      .setName(captionFontSetting) 
      .setDesc(description)
      .setClass("rhino-margins-row");

    for (const side of FONT_SETTINGS) {
      switch(side) {
        case "size":
          if (fontSize != "") {
            fontSetting.addText((t) => {
              t.setPlaceholder("11pt")
              t.setValue(theme[fontSize])
              t.onChange(async (v) => {
                theme[fontSize] = v.trim();
                this.save();
              });
            });
          } 
          break;

        case 'color':
          if (fontColor != "") {
           fontSetting.addColorPicker((t) => {
              t.setValue("#000")
              t.setValue(theme[fontColor])
              t.onChange(async (v) => {
                theme[fontColor] = v.trim();
                this.save();
              });
            });
          }
          break;
        
        case 'style':
          if (fontStyle != "" ) {
            fontSetting.addDropdown((t) => {
              t.addOption("normal", "Normal")
              t.addOption("oblique", "Oblique")
              t.addOption("italic", "Italic")
              t.setValue("normal")
              t.setValue(theme[fontStyle])
              t.onChange(async (v) => {
                theme[fontStyle] = v;
                this.save();
              });
            });
          } 
          break;
        
        case 'weight':
          if (fontWeight != "") {
            fontSetting.addDropdown((t) => {
              t.addOption("normal", "Normal")
              t.addOption("bold", "Bold")
              t.addOption("bolder", "Bolder")
              t.addOption("lighter", "Lighter")
              t.setValue("normal")
              t.setValue(theme[fontWeight])
              t.onChange(async (v) => {
                theme[fontWeight] = v;
                this.save();
              });
            });
          } 
          break;
        
        case 'underline':
          if (fontUnderline != "") {
            fontSetting.addDropdown((t) => {
              t.addOption("none", "No")
              t.addOption("underline", "Yes")
              t.setValue("none")
              t.setValue(theme[fontUnderline])
              t.onChange(async (v) => {
                theme[fontUnderline] = v;
                this.save();
              });
            });
          } 
          break;
        
        case 'transform':
          if (fontTransform != "") {
            fontSetting.addDropdown((t) => {
              t.addOption("none", "None")
              t.addOption("capitalize", "Capitalize")
              t.addOption("uppercase", "Uppercase")
              t.addOption("lowercase", "Lowercase")
              t.setValue("none")
              t.setValue(theme[fontTransform])
              t.onChange(async (v) => {
                theme[fontTransform] = v;
                this.save();
              });
            });
          } 
          break;
      }
    }
  }
}