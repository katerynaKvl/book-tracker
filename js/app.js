console.log('app.js підключено');

const API_URL = 'https://openlibrary.org/search.json?q=harrypotter';

let books = [
    { title: 'Елегантний всесвіт', author: 'Браян Грін', pages: 400, finished: false, status: 'reading' },
    { title: 'Таємна історія', author: 'Донна Тарт', pages: 560, finished: true, status: 'completed' },
    { title: 'Ніби ми злодії', author: 'М.Л. Ріо',  pages: 430, finished: true, status: 'completed' },
    { title: 'Оповідь про мистецтво', author: 'Ернст Гомбріх',  pages: 990, finished: false, status: 'gaveup' },
    { title: 'Орландо', author: 'Вірджинія Вульф',  pages: 270, finished: false, status: 'planned' }
];

const staticCard = document.querySelector('#books-list .card');
if(staticCard){
    staticCard.remove();
}

const listContainer = document.querySelector('#books-list');


/* Функція динамічно рендерить список книг у DOM-дерево, 
   створює картки <article>, встановлює data-pages, умовний клас unread
   та оновлює загальний лічильник книг p#books-count.*/
function renderBooks(booksArray){
    listContainer.innerHTML = '';
    booksArray.forEach(book =>{
        const card = document.createElement('article');
        card.classList.add('card');

        const title = document.createElement('h3');
        title.textContent = book.title;

        const author = document.createElement('p');
        author.classList.add('author');
        author.textContent = book.author;

        card.dataset.pages = book.pages;

        if(!book.finished){
            card.classList.add('unread');
        }

        const cover = document.createElement('div');
        cover.classList.add('cover-placeholder');
        cover.textContent = "Обкладинка";

        const statusWrapper = document.createElement('div');
        statusWrapper.classList.add('status-wrapper');

        const statusSelect = document.createElement('select');
        statusSelect.classList.add('book-status-select');

        statusSelect.classList.add(`status-${book.status}`);

        const statuses = [
            { value: 'reading', text: 'Читаю' },
            { value: 'completed', text: 'Прочитано' },
            { value: 'planned', text: 'В планах' },
            { value: 'gaveup', text: 'Закинуто' },
        ];
        statuses.forEach(st =>{
            const option = document.createElement('option');
            option.value = st.value;
            option.textContent = st.text;
            if (book.status === st.value){
                option.selected = true;
            }
            statusSelect.appendChild(option);
        });
        statusSelect.addEventListener('change', (e) => {
            statusSelect.className = 'book-status-select';
            statusSelect.classList.add(`status-${e.target.value}`);
        });
        statusWrapper.append(statusSelect);

        card.append(cover, title, author, statusWrapper);
        listContainer.append(card);
    });

    const booksCountElement = document.querySelector('#books-count');
    if (booksCountElement) {
        booksCountElement.textContent = `Всього доданих книг: ${booksArray.length}`;
    }
}

renderBooks(books);

//функція, що підраховує суму прочитаних сторінок та позначає, ще не прочитані книги
function processBooks(bookList){
    let totalReadPages = 0;

    for (let i = 0; i < bookList.length; i++){
        const book = bookList[i];

        if (book.finished === false){
            console.log(`Книга "${book.title}" ще НЕ прочитана(${book.pages} стор.).`);
        }else{
            totalReadPages += book.pages;
            console.log(`+"${book.title}" ${book.pages} стор.`)
        }
    }

    console.log(`Загальна сума прочитаних сторінок: ${totalReadPages}стор.`)
    return totalReadPages;
}

//стрілкова функція, що обчислює середню кількість сторінок прочитаних за день
const pagesPerDay = (pages, days) => Math.round(pages / days);

const totalPages = processBooks(books);
const dayCount = 30;
const dailyPages = pagesPerDay(totalPages, dayCount);

console.log(`Середня кількість прочитаних сторінок на день(${dayCount} днів): ${dailyPages} стор.`);


//Обробка події submit для додавання нової книги з форми без перевантаження
const form = document.querySelector('#add-book form');
form.addEventListener('submit', event =>{
    //скасування стандартного перевантаження
    event.preventDefault(); 

    //зчитування даних із полів форми
    const title = document.querySelector('#book-title').value.trim();
    const author = document.querySelector('#book-author').value.trim();
    const pages = Number(document.querySelector('#book-pages').value);
    const status = document.querySelector('#book-status').value;

    const finished = (status === 'completed');

    //формування нового об'єкта та додавання до масиву
    const newBook = {
        title: title,
        author: author,
        pages: pages,
        finished: finished,
        status: status
    };
    books.push(newBook);

    //перемалювання списку книг на сторінці
    renderBooks(books);

    //очищення полів форми
    form.reset();
});


//валідація поля автора, щоб не складалося лише з цифр
const authorInput = document.querySelector('#book-author');
authorInput.addEventListener('input', () =>{
    const value = authorInput.value;
    const onlyDigits = /^\d+$/.test(value);

    if(onlyDigits){
        authorInput.setCustomValidity('Імя автора не може складатися тільки з цифр!');
    } else{
        authorInput.setCustomValidity('');
    }
});

// Перемикання статусу книги між «читаю»/«прочитано» та оновлення лічильника.
listContainer.addEventListener('change', event =>{
    if(event.target.classList.contains('book-status-select')){
        const card = event.target.closest('.card');
        const index = Array.from(listContainer.children).indexOf(card);

        const newStatus = event.target.value;
        books[index].status = newStatus;
        books[index].finished = (newStatus === 'completed');

        renderBooks(books);
    }
});

// Створення елементів для повідомлень API та кнопки оновлення в DOM
const sectionMyBooks = document.querySelector('#my-books');
const messageContainer = document.createElement('div');
messageContainer.id = 'api-message-container';
sectionMyBooks.insertBefore(messageContainer, listContainer);

// Створення кнопки оновити
const refreshButton = document.createElement('button');
refreshButton.textContent = 'Оновити список із сервера';
refreshButton.type = 'button';
refreshButton.style.margin = '10px 0';
refreshButton.classList.add('refresh-btn');
sectionMyBooks.insertBefore(refreshButton, listContainer);

function showApiMessage(text, isError = false) {
    messageContainer.textContent = text;
    messageContainer.style.color = isError ? 'red' : 'green';
}

// стоворення async-функції для завантаження даних із сервера
async function loadBooksData(){
    showApiMessage('Завантаження даниз із сервера...', false);
    refreshButton.disabled = true;

    try{
        const response = await fetch(API_URL);

        if(!response.ok){
            throw new Error('Помилка серверу: код ${responce.status}');
        }

        //розбір json та виведення структури у консоль
        const data = await response.json();
        console.log('Отримані дані від API', data);

        if(!data.docs || data.docs.length === 0){
            throw new Error('За запитом нічого не знайдено');
        }

        //Адаптація полів відповіді API (title, author_name, median_pages) та виведення в DOM
        const apiBooks = data.docs.slice(0,5).map(item => ({
            title: item.title,
            author: item.author_name ? item.author_name.join(', '): 'Невідомий автор',
            page: item.number_of_pages_median || 300,
            finished: false,
            status: 'planned'
        }));

        // Оновлення глобального масиву та рендер списока
        books = apiBooks;
        renderBooks(apiBooks);
        showApiMessage('Дані успішно завантажено.', false);

    }catch(error){
        // Обробка помилок та дублювання деталей у console.error
        console.error('Деталі помилки запиту:', error);
        let userMessage = 'Не вдалося завантажити дані. Спробуйте пізніше.';

        if (error.message === 'За запитом нічого не знайдено.') {
            userMessage = 'За запитом нічого не знайдено.';
        } else if(!navigator.onLine){
            userMessage = 'Мережевий збій: перевірте підключення до інтернету.';
        }
        showApiMessage(userMessage, true);
        listContainer.innerHTML = `<p class="error-notification">${userMessage}</p>`;
    }finally{
        //Вимкнення стану завантаження в блоці finally незалежно від результату
        refreshButton.disabled = false;
    }
} 

//Прив'язка повторного виклику loadBooksData() до кнопки оновлення
refreshButton.addEventListener('click', () => {
    loadBooksData();
})