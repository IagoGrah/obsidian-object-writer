import { App, moment, MomentFormatComponent, Notice, Plugin, PluginSettingTab, Setting, normalizePath, MarkdownView } from 'obsidian';
import words from 'words';

interface ObjectWriterPluginSettings {
	noteName: string;
	dateFormat: string;
	timeFormat: string;
	newFileLocation: string;
	addTag: boolean;
	addTimer: boolean;
	timerDuration: number;
	timerPosition: string;
	timerAutoRead: boolean;
	timerAddRule: boolean;
}

const DEFAULT_SETTINGS: ObjectWriterPluginSettings = {
	noteName: '{{date}} ({{object}})',
	dateFormat: 'YYYY-MM-DD',
	timeFormat: 'HH:mm',
	newFileLocation: 'ObjectWriter',
	addTag: true,
	addTimer: true,
	timerDuration: 600,
	timerPosition: 'center',
	timerAutoRead: true,
	timerAddRule: true,
}

export default class ObjectWriterPlugin extends Plugin {
	settings: ObjectWriterPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('lucide-pen-tool', 'Create object writing note', async (evt: MouseEvent) => {
			this.createObjectWriterNote();
		});

		this.addSettingTab(new ObjectWriterSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor('objectwritertimer', (source, el) => {
			const dateString = source.trim();
			const targetDate = moment(dateString, true).toDate();
			if (!targetDate.getTime()) {
				return;
			}
			let now = new Date().getTime();
			let timeRemaining = targetDate.getTime() - now;
			if (timeRemaining < 0) {
				return;
			}

			const countdownContainer = el.createDiv(`object-writer-timer ${this.settings.timerPosition}`);
			const minutesElement = countdownContainer.createSpan();
			const secondsElement = countdownContainer.createSpan();

			const updateTimer = () => {
				now = new Date().getTime();
				timeRemaining = targetDate.getTime() - now;
				if (timeRemaining < 0) {
					countdownContainer.remove();
					if (this.settings.timerAutoRead) {
						const leaf = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;
						if (leaf) {
							const viewState = leaf.getViewState();
							viewState.state.mode = 'preview';
							viewState.state.source = false;
							leaf.setViewState(viewState);
						}
					}
					return;
				}

				const minutes = Math.floor(
					(timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
				);
				const seconds = Math.floor(
					(timeRemaining % (1000 * 60)) / 1000
				);
				minutesElement.setText(`${minutes}:`);
				secondsElement.setText(`${seconds < 10 ? '0' : ''}${seconds}`);

				setTimeout(updateTimer, 1000);
			};
			updateTimer();
    });
	}

	async createObjectWriterNote() {
		let newFile = null;

		const randomWord = words[Math.floor(Math.random() * words.length)];
		const fileName = await this.getNewNoteName(randomWord);
		const filePath = normalizePath(this.settings.newFileLocation + '/' + fileName + '.md');
		try {
			let noteContent = [];
			if (this.settings.addTag) {
				noteContent.push('#ObjectWriter');
				noteContent.push('\n\n')
			}
			if (this.settings.addTimer){
				const timerTarget = new Date();
				timerTarget.setSeconds(timerTarget.getSeconds() + this.settings.timerDuration);
				noteContent.push(`\`\`\`objectwritertimer\n${timerTarget.toISOString()}\n\`\`\``)
				if (this.settings.timerAddRule) {
					noteContent.push('\n---');
				}
				noteContent.push('\n\n');
			}
			newFile = await this.app.vault.create(filePath, noteContent.join(''));
		} catch (error) {
			new Notice(`Couldn't create object writing note: ${fileName}\n${error.toString()}`);
		}

		if (newFile) {
			await this.app.workspace.getLeaf(false).openFile(newFile);
			let editor = this.app.workspace.activeEditor?.editor;
			editor?.setCursor(editor.lastLine(), 0);
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
			.setDesc('Name format for new object writing notes. You can use the following keywords: {{date}}, {{time}}, {{object}}')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.noteName)
				.setValue(this.plugin.settings.noteName)
				.onChange(async (value) => {
					this.plugin.settings.noteName = value;
					await this.plugin.saveSettings();
				}));

		const getSyntaxDesc = (setting: Setting, formatComponent: MomentFormatComponent) => {
			if (formatComponent) {
				const text = setting.descEl.createDiv("text");
				text.setText("Your current syntax looks like this: ");
				const sampleEl = text.createSpan("sample");
				formatComponent.setSampleEl(sampleEl);
			}
		}

		let dateFormatComponent!: MomentFormatComponent;
		const dateFormatSetting = new Setting(containerEl)
			.setName('Date format')
			.addMomentFormat((format: MomentFormatComponent) => {
				dateFormatComponent = format
					.setDefaultFormat(DEFAULT_SETTINGS.dateFormat)	
					.setPlaceholder(DEFAULT_SETTINGS.dateFormat)
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (value) => {
						this.plugin.settings.dateFormat = value;
						await this.plugin.saveSettings();
					});
				});
		getSyntaxDesc(dateFormatSetting, dateFormatComponent);

		let timeFormatComponent!: MomentFormatComponent;
		const timeFormatSetting = new Setting(containerEl)
			.setName('Time format')
			.addMomentFormat((format: MomentFormatComponent) => {
				timeFormatComponent = format
					.setDefaultFormat(DEFAULT_SETTINGS.timeFormat)	
					.setPlaceholder(DEFAULT_SETTINGS.timeFormat)
					.setValue(this.plugin.settings.timeFormat)
					.onChange(async (value) => {
						this.plugin.settings.timeFormat = value;
						await this.plugin.saveSettings();
					});
				});
		getSyntaxDesc(timeFormatSetting, timeFormatComponent);

		new Setting(containerEl)
			.setName('New file location')
			.setDesc('New object writing notes will be placed here. Please inform an existing folder.')
			.addText(text => text
				.setPlaceholder('Example: folder1/folder2')
				.setValue(this.plugin.settings.newFileLocation)
				.onChange(async (value) => {
					this.plugin.settings.newFileLocation = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Add tag')
			.setDesc('When you create a new object writing note, automatically add a #ObjectWriter tag.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addTag)
				.onChange(async (value) => {
					this.plugin.settings.addTag = value;
					await this.plugin.saveSettings();
				}));
			
		new Setting(containerEl)
			.setHeading()
			.setName('Timer');

		new Setting(containerEl)
			.setName('Add timer')
			.setDesc('When you create a new object writing note, include a countdown timer.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addTimer)
				.onChange(async (value) => {
					this.plugin.settings.addTimer = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Timer duration (in seconds)')
			.setDesc('Set this to how long you want to write for and the timer (if enabled) will count down for you.')
			.addText(text => {
				text.inputEl.type = 'number';
				text.setValue(String(this.plugin.settings.timerDuration));
				text.onChange(async (value) => {
					this.plugin.settings.timerDuration = value !== '' ? Number(value) : 0;
					await this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName('Timer position')
			.setDesc('Where the timer will be shown (left, center or right).')
			.addDropdown(async dropdown => {
				dropdown.addOption('left', 'left');
				dropdown.addOption('center', 'center');
				dropdown.addOption('right', 'right');
				dropdown.setValue(this.plugin.settings.timerPosition);
				dropdown.onChange(async (option) => {
					this.plugin.settings.timerPosition = option;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Enter read mode when timer ends')
			.setDesc('When your time is up, the note will automatically enter reading mode. You can return to edit mode normally afterwards.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.timerAutoRead)
				.onChange(async (value) => {
					this.plugin.settings.timerAutoRead = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Add horizontal rule')
			.setDesc('Add a horizontal rule (---) below the timer to separate it from your writing.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.timerAddRule)
				.onChange(async (value) => {
					this.plugin.settings.timerAddRule = value;
					await this.plugin.saveSettings();
				}));
	}
}
