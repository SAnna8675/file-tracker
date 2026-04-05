"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");
class FileTracker {
    constructor() {
        this.dataFilePath = path.join(os.homedir(), 'file-tracker-data.json');
        this.initializeDataFile();
    }
    initializeDataFile() {
        if (!fs.existsSync(this.dataFilePath)) {
            const initialData = {
                trackedFiles: [
                    // Добавляем тестовый файл для демонстрации
                    {
                        path: path.join(os.homedir(), 'test-file.txt'),
                        fileName: 'test-file.txt',
                        addedDate: Date.now(),
                        lastNotificationDate: Date.now() - 31 * 24 * 60 * 60 * 1000,
                        marks: ''
                    }
                ]
            };
            fs.writeFileSync(this.dataFilePath, JSON.stringify(initialData, null, 2));
        }
    }
    readData() {
        try {
            const data = JSON.parse(fs.readFileSync(this.dataFilePath, 'utf8'));
            console.log('FileTracker: Прочитано файлов:', data.trackedFiles.length);
            return data;
        }
        catch (error) {
            console.error('FileTracker: Ошибка чтения данных:', error);
            return { trackedFiles: [] };
        }
    }
    writeData(data) {
        try {
            fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
            console.log('FileTracker: Данные сохранены');
        }
        catch (error) {
            console.error('FileTracker: Ошибка записи данных:', error);
        }
    }
    is30DaysPassed(lastDate) {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const result = Date.now() - lastDate >= thirtyDaysInMs;
        console.log(`FileTracker: Проверка 30 дней: ${result} (${Date.now() - lastDate}ms прошло)`);
        return result;
    }
    checkFiles() {
        console.log('FileTracker: Запуск проверки файлов...');
        const data = this.readData();
        let changed = false;
        if (data.trackedFiles.length === 0) {
            console.log('FileTracker: Нет файлов для отслеживания');
            vscode.window.showWarningMessage('File Tracker: Нет файлов для отслеживания');
            return;
        }
        for (const file of data.trackedFiles) {
            console.log(`FileTracker: Проверка файла: ${file.fileName}`);
            let fileChanged = false;
            // Проверка 1: файл не существует
            if (!fs.existsSync(file.path)) {
                if (file.error1 !== 'ERROR') {
                    file.error1 = 'ERROR';
                    file.error1Notified = false;
                    fileChanged = true;
                    console.log(`FileTracker: Файл не существует: ${file.fileName}`);
                }
                if (!file.error1Notified) {
                    vscode.window.showErrorMessage(`Файл не найден: ${file.fileName}`);
                    file.error1Notified = true;
                    fileChanged = true;
                }
            }
            else {
                // Если файл существует и ошибка была - очищаем
                if (file.error1 === 'ERROR') {
                    file.error1 = '';
                    file.error1Notified = false;
                    fileChanged = true;
                    console.log(`FileTracker: Файл восстановлен: ${file.fileName}`);
                }
            }
            // Проверка 2: дата в будущем
            if (file.lastNotificationDate > Date.now()) {
                if (file.error2 !== 'ERROR') {
                    file.error2 = 'ERROR';
                    file.error2Notified = false;
                    fileChanged = true;
                    console.log(`FileTracker: Дата в будущем: ${file.fileName}`);
                }
                if (!file.error2Notified) {
                    vscode.window.showErrorMessage(`Дата уведомления в будущем: ${file.fileName}`);
                    file.error2Notified = true;
                    fileChanged = true;
                }
            }
            else {
                // Если дата больше не в будущем - очищаем ошибку
                if (file.error2 === 'ERROR') {
                    file.error2 = '';
                    file.error2Notified = false;
                    fileChanged = true;
                }
            }
            // Проверка 3: некорректная дата
            if (!file.lastNotificationDate || isNaN(file.lastNotificationDate)) {
                if (file.error3 !== 'ERROR') {
                    file.error3 = 'ERROR';
                    file.error3Notified = false;
                    fileChanged = true;
                    console.log(`FileTracker: Некорректная дата: ${file.fileName}`);
                }
                if (!file.error3Notified) {
                    vscode.window.showErrorMessage(`Некорректная дата: ${file.fileName}`);
                    file.error3Notified = true;
                    fileChanged = true;
                }
            }
            else {
                // Если дата корректна - очищаем ошибку
                if (file.error3 === 'ERROR') {
                    file.error3 = '';
                    file.error3Notified = false;
                    fileChanged = true;
                }
            }
            // При ошибке 3 - пропускаем расчеты
            if (file.error3 === 'ERROR') {
                console.log(`FileTracker: Пропуск из-за ошибки даты: ${file.fileName}`);
                continue;
            }
            // Расчет уведомления через 30 дней
            if (this.is30DaysPassed(file.lastNotificationDate)) {
                console.log(`FileTracker: 30 дней прошло для: ${file.fileName}`);
                // Инициализируем marks если нужно
                if (!file.marks) {
                    file.marks = '';
                }
                // Добавляем знак & (максимум 5)
                file.marks += '&';
                if (file.marks.length > 5) {
                    file.marks = '&&&&&';
                }
                vscode.window.showInformationMessage(`Проверь файл: ${file.fileName} ${file.marks}`);
                // Обновляем дату последнего уведомления
                file.lastNotificationDate = Date.now();
                fileChanged = true;
                console.log(`FileTracker: Уведомление отправлено для: ${file.fileName}`);
            }
            if (fileChanged) {
                changed = true;
                console.log(`FileTracker: Файл изменен: ${file.fileName}`);
            }
        }
        if (changed) {
            this.writeData(data);
            console.log('FileTracker: Изменения сохранены');
        }
        else {
            console.log('FileTracker: Изменений нет');
        }
    }
    start() {
        console.log('FileTracker: Сервис запущен');
        // Первая проверка через 2 секунды после запуска
        setTimeout(() => {
            this.checkFiles();
        }, 2000);
        // Проверка каждые 30 секунд для тестирования
        setInterval(() => {
            this.checkFiles();
        }, 30 * 1000);
        // И ежедневно
        setInterval(() => {
            this.checkFiles();
        }, 24 * 60 * 60 * 1000);
    }
    // Метод для добавления файлов вручную (для тестирования)
    addTestFile() {
        const data = this.readData();
        const testFile = {
            path: path.join(os.homedir(), 'test-tracked-file.txt'),
            fileName: 'test-tracked-file.txt',
            addedDate: Date.now(),
            lastNotificationDate: Date.now() - 31 * 24 * 60 * 60 * 1000,
            marks: ''
        };
        data.trackedFiles.push(testFile);
        this.writeData(data);
        vscode.window.showInformationMessage('Тестовый файл добавлен для отслеживания');
    }
}
let tracker;
function activate(context) {
    console.log('File Tracker: Плагин активирован');
    vscode.window.showInformationMessage('File Tracker: Плагин активирован');
    tracker = new FileTracker();
    tracker.start();
    // Команда для добавления тестового файла
    const addTestFileCommand = vscode.commands.registerCommand('fileTracker.addTestFile', () => {
        tracker.addTestFile();
    });
    context.subscriptions.push(addTestFileCommand);
}
exports.activate = activate;
function deactivate() {
    console.log('File Tracker: Плагин деактивирован');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map