/*Фреймворк Vue3 обрано через можливість швидкого підключення через CDN 
без необхідності налаштування складних локальних збірок (Node.js/Vite), 
що дозволяє повноцінно реалізувати компонентний підхід для навчального завдання. 
*/

console.log('app.js підключено');

const API_URL = 'https://openlibrary.org/search.json?q=harrypotter';

/* 
  Дочірній компонент BookRow.
  Отримує об'єкт книги через props та передає подію зміни статусу нагору через $emit.
*/
const BookRow = {
    props: ['book'],
    emits: ['toggle-status'],
    template: `
        <article class="card" :data-pages="book.pages" :class="{ unread: !book.finished }">
            <div class="cover-placeholder">Обкладинка</div>
            <h3>{{ book.title }}</h3>
            <p class="author">{{ book.author }}</p>
            <div class="status-wrapper">
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
            // Перенесення початкового масиву у реактивний стан data() з унікальними id
            books: [
                { id: 1, title: 'Елегантний всесвіт', author: 'Браян Грін', pages: 400, finished: false, status: 'reading' },
                { id: 2, title: 'Таємна історія', author: 'Донна Тарт', pages: 560, finished: true, status: 'completed' },
                { id: 3, title: 'Ніби ми злодії', author: 'М.Л. Ріо', pages: 430, finished: true, status: 'completed' },
                { id: 4, title: 'Оповідь про мистецтво', author: 'Ернст Гомбріх', pages: 990, finished: false, status: 'gaveup' },
                { id: 5, title: 'Орландо', author: 'Вірджинія Вульф', pages: 270, finished: false, status: 'planned' }
            ],
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
    methods: {
        // Крок 6 & 8. Метод оновлення статусу книги (перемикання між статусами та фін. станом)
        toggleBookStatus(id, newStatus) {
            const book = this.books.find(b => b.id === id);
            if (book) {
                book.status = newStatus;
                book.finished = (newStatus === 'completed');
            }
        },
       // Обробка форми додавання нової книги
        addNewBook() {
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
                this.books = data.docs.slice(0, 5).map((item, index) => ({
                    id: Date.now() + index,
                    title: item.title,
                    author: item.author_name ? item.author_name.join(', ') : 'Невідомий автор',
                    pages: item.number_of_pages_median || 300,
                    finished: false,
                    status: 'planned'
                }));

                this.apiMessage = 'Дані успішно завантажено.';
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