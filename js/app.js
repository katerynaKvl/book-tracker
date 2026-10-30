console.log('app.js підключено');

const books = [
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

        const statusBadge = document.createElement('span');
        statusBadge.classList.add('status-badge');

        switch (book.status){
            case 'completed':
                statusBadge.classList.add('status-completed');
                statusBadge.textContent = "Прочитано";
                break;
            case 'reading':
                statusBadge.classList.add('status-reading');
                statusBadge.textContent = "Читаю";
                break;
            case 'planned':
                statusBadge.classList.add('status-planned');
                statusBadge.textContent = "В планах";
                break;
            case 'gaveup':
                statusBadge.classList.add('status-gaveup');
                statusBadge.textContent = "Закинуто";
                break;
        }

        statusWrapper.append(statusBadge);

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


//Обробка події submit для додавання нової книги без перевантаження
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


//валідація поля автора(щоб не складалося лише з цифр)
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
        const index = Array.form(listContainer.children).indexOf(card);

        const newStatus = event.target.value;
        books[index].status = newStatus;
        books[index].finished = (newStatus === 'completed');

        renderBooks(books);
    }
});