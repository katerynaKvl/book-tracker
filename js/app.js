console.log('app.js підключено');

const books = [
    { title: 'Елегантний всесвіт', pages: 400, finished: false },
    { title: 'Таємна історія', pages: 560, finished: true },
    { title: 'Ніби ми злодії', pages: 430, finished: true },
    { title: 'Оповідь про мистецтво', pages: 990, finished: false },
    { title: 'Орландо', pages: 270, finished: false }
];

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