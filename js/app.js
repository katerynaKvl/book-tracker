/*Фреймворк Vue3 обрано через можливість швидкого підключення через CDN 
без необхідності налаштування складних локальних збірок (Node.js/Vite), 
що дозволяє повноцінно реалізувати компонентний підхід для навчального завдання. 
*/

console.log('app.js підключено');

const API_URL = 'https://openlibrary.org/search.json?q=harrypotter';

/* ==========================================
   РОБОТА З LOCALSTORAGE (Кроки 2-3)
   ================================---------- */
function saveToLocalStorage(items) {
    try {
        localStorage.setItem('appItems', JSON.stringify(items));
    } catch (error) {
        console.error('Помилка збереження в localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem('appItems');
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

/* ==========================================
   РОБОТА З INDEXEDDB (Кроки 5, 6, 7, 8, 11)
   ================================---------- */
const DB_NAME = 'BooksDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

// Крок 6: Відкриття бази даних з обробником onupgradeneeded та обгорткою в Promise
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Створюємо object store з keyPath 'id' (варіант 9)
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Крок 7: CRUD - Отримати всі записи (readonly)
async function getAllItems() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('IndexedDB недоступна (можливо, режим інкогніто):', error);
        throw new Error('IndexedDB недоступна. Перевірте налаштування браузера.');
    }
}

// Крок 7: CRUD - Додати або оновити запис через put (readwrite)
async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Крок 7: CRUD - Видалити запис за id (readwrite)
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}


/* 
  Дочірній компонент BookRow.
  Отримує об'єкт книги через props та передає подію зміни статусу нагору через $emit.
*/
const BookRow = {
    props: ['book'],
    emits: ['toggle-status', 'delete-book'],
    template: `
        <article class="card" :data-pages="book.pages" :class="{ unread: !book.finished }">
            <div class="cover-placeholder">Обкладинка</div>
            <h3>{{ book.title }}</h3>
            <p class="author">{{ book.author }}</p>
            <div class="status-wrapper" style="display: flex; flex-direction: column; gap: 8px;">
                <select 
                    class="book-status-select" 
                    :class="'status-' + book.status"
                    :value="book.status"
                    @change="$emit('toggle-status', book.id, $event.target.value)"
                >
                    <option value="reading">Читаю</option>
                    <option value="completed">Прочитано</option>
                    <option value="planned">В планах</option>
                    <option value="gaveup">Закинуто</option>
                </select>
            </div>
        </article>
    `
};

/* Головний застосунок Vue */
const App = {
    data() {
        return {
            books: [],
            // Поля форми додавання книги
            formTitle: '',
            formAuthor: '',
            formPages: '',
            formStatus: 'reading',
            // Стани для API запитів
            apiMessage: '',
            isApiError: false,
            isLoading: false
        };
    },
    computed: {
        // Похідні значення для блоку статистики (автоматично оновлюються при зміні масиву books)
        completedCount() {
            return this.books.filter(b => b.status === 'completed').length;
        },
        readingCount() {
            return this.books.filter(b => b.status === 'reading').length;
        },
        gaveupCount() {
            return this.books.filter(b => b.status === 'gaveup').length;
        }
    },
    async mounted() {
        // Початкові дефолтні дані для першого заповнення
        const defaultBooks = [
            { id: 1, title: 'Елегантний всесвіт', author: 'Браян Грін', pages: 400, finished: false, status: 'reading' },
            { id: 2, title: 'Таємна історія', author: 'Донна Тарт', pages: 560, finished: true, status: 'completed' },
            { id: 3, title: 'Ніби ми злодії', author: 'М.Л. Ріо', pages: 430, finished: true, status: 'completed' },
            { id: 4, title: 'Оповідь про мистецтво', author: 'Ернст Гомбріх', pages: 990, finished: false, status: 'gaveup' },
            { id: 5, title: 'Орландо', author: 'Вірджинія Вульф', pages: 270, finished: false, status: 'planned' }
        ];

        try {
            // Отримуємо дані з IndexedDB
            let dbBooks = await getAllItems();

            // Крок 8: Одноразова міграція з localStorage в IndexedDB, якщо база порожня
            if (dbBooks.length === 0) {
                const isMigrated = localStorage.getItem('migrated');
                if (!isMigrated) {
                    const localData = loadFromLocalStorage();
                    const initialItems = (localData && localData.length > 0) ? localData : defaultBooks;
                    
                    for (const book of initialItems) {
                        await addItem(book);
                    }
                    localStorage.setItem('migrated', 'true');
                    dbBooks = await getAllItems();
                }
            }

            this.books = dbBooks;
            saveToLocalStorage(this.books);

        } catch (error) {
            console.error('Помилка ініціалізації IndexedDB:', error);
            this.apiMessage = 'Увага: IndexedDB недоступна. Використовується localStorage.';
            this.isApiError = true;
            
            // Fallback на localStorage
            const localData = loadFromLocalStorage();
            this.books = (localData && localData.length > 0) ? localData : defaultBooks;
        }
    },
    methods: {
        // Крок 6 & 8. Метод оновлення статусу книги (збереження в БД через put)
        async toggleBookStatus(id, newStatus) {
            const book = this.books.find(b => b.id === id);
            if (book) {
                book.status = newStatus;
                book.finished = (newStatus === 'completed');
                
                try {
                    // Робимо звичайний clone через JSON, щоб прибрати Vue Proxy
                    const plainBook = JSON.parse(JSON.stringify(book));
                    await addItem(plainBook); // зберігаємо чистий об'єкт у БД
                    saveToLocalStorage(this.books);
                    console.log('Статус успішно оновлено!');
                } catch (e) {
                    console.error('Помилка оновлення в БД:', e);
                }
            }
        },

       // Обробка форми додавання нової книги
        async addNewBook() {
            if (!this.formTitle || !this.formAuthor || !this.formPages) return;
            
            const newBook = {
                id: Date.now(), // унікальний id для key у v-for
                title: this.formTitle,
                author: this.formAuthor,
                pages: Number(this.formPages),
                status: this.formStatus,
                finished: (this.formStatus === 'completed')
            };

            this.books.push(newBook);

            try {
                await addItem(newBook);
                saveToLocalStorage(this.books);
            } catch (e) {
                console.error('Помилка додавання до БД:', e);
            }

            // Очищення полів форми
            this.formTitle = '';
            this.formAuthor = '';
            this.formPages = '';
            this.formStatus = 'reading';
        },

        // Асинхронне завантаження даних із Open Library API 
        async loadBooksData() {
            this.apiMessage = 'Завантаження даних із сервера...';
            this.isApiError = false;
            this.isLoading = true;

            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`Помилка серверу: код ${response.status}`);
                }

                const data = await response.json();
                if (!data.docs || data.docs.length === 0) {
                    throw new Error('За запитом нічого не знайдено.');
                }

                // Мапінг даних від API у формат нашого застосунку
                const fetchedBooks = data.docs.slice(0, 5).map((item, index) => ({
                    id: Date.now() + index,
                    title: item.title,
                    author: item.author_name ? item.author_name.join(', ') : 'Невідомий автор',
                    pages: item.number_of_pages_median || 300,
                    finished: false,
                    status: 'planned'
                }));

                for (const b of fetchedBooks) {
                    this.books.push(b);
                    await addItem(b);
                }
                saveToLocalStorage(this.books);

                this.apiMessage = 'Дані успішно завантажено та збережено.';
            } catch (error) {
                console.error('Деталі помилки запиту:', error);
                if (error.message === 'За запитом нічого не знайдено.') {
                    this.apiMessage = 'За запитом нічого не знайдено.';
                } else if (!navigator.onLine) {
                    this.apiMessage = 'Мережевий збій: перевірте підключення до інтернету.';
                } else {
                    this.apiMessage = 'Не вдалося завантажити дані. Спробуйте пізніше.';
                }
                this.isApiError = true;
            } finally {
                this.isLoading = false;
            }
        }
    }
};

// Створення та монтування Vue-застосунку в елемент #app
const app = Vue.createApp(App);
app.component('book-row', BookRow);
app.mount('#app');

/* 
  Примітка щодо ручного DOM-коду:
  Стару функцію ручного рендеру renderBooks(booksArray) з практикуму 7 повністю видалено, 
  оскільки її функціонал повністю замінено декларативним рендером за допомогою компонентів Vue, 
  директиви v-for та реактивного стану.
*/