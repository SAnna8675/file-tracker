import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface TrackedFile {
    path: string;
    fileName: string;
    addedDate: number;
    lastNotificationDate: number;
    error1?: string;
    error2?: string;
    error3?: string;
    marks?: string;
    error1Notified?: boolean;
    error2Notified?: boolean;
    error3Notified?: boolean;
}

class FileTracker {
    private dataFilePath = path.join(os.homedir(), 'file-tracker-data.json');

    constructor() {
        if (!fs.existsSync(this.dataFilePath)) {
            fs.writeFileSync(this.dataFilePath, JSON.stringify({ trackedFiles: [] }));
        }
    }

    private readData() {
        try {
            return JSON.parse(fs.readFileSync(this.dataFilePath, 'utf8'));
        } catch {
            return { trackedFiles: [] };
        }
    }

    private writeData(data: any) {
        fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
    }

    private is30DaysPassed(lastDate: number): boolean {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        return Date.now() - lastDate >= thirtyDaysInMs;
    }

    public checkFiles() {
        const data = this.readData();
        let changed = false;

        for (const file of data.trackedFiles) {
            
            // Проверка 1: файл не существует
            if (!fs.existsSync(file.path)) {
                if (file.error1 !== 'ERROR') {
                    file.error1 = 'ERROR';
                    file.error1Notified = false;
                    changed = true;
                }
                if (!file.error1Notified) {
                    vscode.window.showErrorMessage(`Файл не найден: ${file.fileName}`);
                    file.error1Notified = true;
                    changed = true;
                }
            } else {
                // Если файл существует и ошибка была - очищаем
                if (file.error1 === 'ERROR') {
                    file.error1 = '';
                    file.error1Notified = false;
                    changed = true;
                }
            }

            // Проверка 2: дата в будущем
            if (file.lastNotificationDate > Date.now()) {
                if (file.error2 !== 'ERROR') {
                    file.error2 = 'ERROR';
                    file.error2Notified = false;
                    changed = true;
                }
                if (!file.error2Notified) {
                    vscode.window.showErrorMessage(`Дата уведомления в будущем: ${file.fileName}`);
                    file.error2Notified = true;
                    changed = true;
                }
            } else {
            // Если дата больше не в будущем - очищаем ошибку
            if (file.error2 === 'ERROR') {
                file.error2 = '';
                file.error2Notified = false;
                changed = true;
            }
            }

            // Проверка 3: некорректная дата
            if (!file.lastNotificationDate || isNaN(file.lastNotificationDate)) {
                if (file.error3 !== 'ERROR') {
                    file.error3 = 'ERROR';
                    file.error3Notified = false;
                    changed = true;
                }
                if (!file.error3Notified) {
                    vscode.window.showErrorMessage(`Некорректная дата: ${file.fileName}`);
                    file.error3Notified = true;
                    changed = true;
                }
            } else {
                // Если дата корректна - очищаем ошибку
                if (file.error3 === 'ERROR') {
                    file.error3 = '';
                    file.error3Notified = false;
                    changed = true;
                }
            }
            // При ошибке 3 - пропускаем расчеты
            if (file.error3 === 'ERROR') {
                continue;
            }

            // Расчет уведомления через 30 дней (даже при ошибках 1 и 2)
            if (this.is30DaysPassed(file.lastNotificationDate)) {
                //Инициилизируем marks если нужно
                if (!file.marks) file.marks = '';
                // Добавляем знак & (максимум 5)
                file.marks += '&';
                if (file.marks.length > 5) file.marks = '&&&&&';    
                    vscode.window.showInformationMessage(
                    `Проверь файл: ${file.fileName} ${file.marks}`
                );        
                // Обновляем дату последнего уведомления
                file.lastNotificationDate = Date.now();
                changed = true;
            }

            if (changed) this.writeData(data);
        }
    }

    public start() {
            // Проверка сразу и ежедневно
            this.checkFiles();
            setInterval(() => this.checkFiles(), 10 * 1000); ////24 * 60 * 60 * 1000
    }
}
let tracker: FileTracker;

export function activate() {
    // Проверка активации
    vscode.window.showInformationMessage('File Tracker: Плагин активирован');
    
    tracker = new FileTracker();
    tracker.start();
}

export function deactivate() {}