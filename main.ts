import { App, Plugin, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import moment from 'moment';
import words from 'words';

interface ObjectWriterPluginSettings {
	noteName: string;
	dateFormat: string;
	timeFormat: string;
	newFileLocation: string;
	addTag: boolean;
}

const DEFAULT_SETTINGS: ObjectWriterPluginSettings = {
	noteName: '{{date}} ({{object}})',
	dateFormat: 'YYYY-MM-DD',
	timeFormat: 'HH:mm',
	newFileLocation: 'ObjectWriter',
	addTag: true
}

export default class ObjectWriterPlugin extends Plugin {
	settings: ObjectWriterPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('lucide-pen-tool', 'Create Object Writer note', async (evt: MouseEvent) => {
			this.createObjectWriterNote();
		});

		this.addSettingTab(new ObjectWriterSettingTab(this.app, this));
	}

	async createObjectWriterNote() {
		let newFile = null;
		
		const randomWord = words[Math.floor(Math.random() * words.length)];
		const fileName = await this.getNewNoteName(randomWord);
		const filePath = normalizePath(this.settings.newFileLocation + '/' + fileName + '.md');
		try {
			newFile = await this.app.vault.create(filePath, this.settings.addTag ? '#ObjectWriter' : '');
		} catch (error) {
			alert(`Couldn't create Object Writer file: ${fileName}\n${error.toString()}`);
		}

		if (newFile) {
			await this.app.workspace.getLeaf(false).openFile(newFile);
		}
	}

	async getNewNoteName(randomWord: string) {
		return this.settings.noteName
			.replace('{{date}}', moment().format(this.settings.dateFormat))
			.replace('{{time}}', moment().format(this.settings.timeFormat))
			.replace('{{object}}', randomWord);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ObjectWriterSettingTab extends PluginSettingTab {
	plugin: ObjectWriterPlugin;

	constructor(app: App, plugin: ObjectWriterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Note name')
			.setDesc('Name format for new Object Writer notes. You can use the following keywords: {{date}}, {{time}}, {{object}}')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.noteName)
				.setValue(this.plugin.settings.noteName)
				.onChange(async (value) => {
					this.plugin.settings.noteName = value;
					await this.plugin.saveSettings();
				}));

		const getSyntaxDesc = (format: string, defaultFormat: string) => {
			if (!format) {
				format = defaultFormat;
			}
			return `Your current syntax looks like this: ${moment().format(format)}`;
		}
		let dateFormatSetting = new Setting(containerEl)
			.setName('Date format')
			.setDesc(getSyntaxDesc(this.plugin.settings.dateFormat, DEFAULT_SETTINGS.dateFormat))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.dateFormat)
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					dateFormatSetting.setDesc(getSyntaxDesc(value, DEFAULT_SETTINGS.dateFormat));
					await this.plugin.saveSettings();
				}));

		let timeFormatSetting = new Setting(containerEl)
			.setName('Time format')
			.setDesc(getSyntaxDesc(this.plugin.settings.timeFormat, DEFAULT_SETTINGS.timeFormat))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.timeFormat)
				.setValue(this.plugin.settings.timeFormat)
				.onChange(async (value) => {
					this.plugin.settings.timeFormat = value;
					timeFormatSetting.setDesc(getSyntaxDesc(value, DEFAULT_SETTINGS.timeFormat));
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('New file location')
			.setDesc('New Object Writer notes will be placed here. Please inform an existing folder.')
			.addText(text => text
				.setPlaceholder('Example: folder1/folder2')
				.setValue(this.plugin.settings.newFileLocation)
				.onChange(async (value) => {
					this.plugin.settings.newFileLocation = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Add tag')
			.setDesc('When you create a new Object Writer note, automatically add a #ObjectWriter tag.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addTag)
				.onChange(async (value) => {
					this.plugin.settings.addTag = value;
					await this.plugin.saveSettings();
				}));
	}
}
