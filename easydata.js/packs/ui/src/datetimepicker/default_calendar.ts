import { i18n } from '@easydata/core';

import { domel } from '../utils/dom_elem_builder';

import { Calendar, CalendarOptions } from './calendar';

export class DefaultCalendar extends Calendar {

    protected daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    protected months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    protected calendarBody: HTMLElement | null = null;
    protected headerTextElem: HTMLElement | null;

    protected selectYearElem: HTMLSelectElement | null;
    protected selectMonthElem: HTMLSelectElement | null;

    protected selectedMonth: number;
    protected selectedYear: number;

    constructor(slot: HTMLElement, options?: CalendarOptions) {
        super(slot, options);

        for(let i = 0; i < this.daysOfWeek.length; i++) {
            this.daysOfWeek[i] = i18n.getShortWeekDayName(i + 1)
        }

        for(let i = 0; i < this.months.length; i++) {
            this.months[i] = i18n.getLongMonthName(i + 1)
        }
    }

    public setDate(date: Date) {
        super.setDate(date);

        this.selectedMonth = this.currentDate.getMonth();
        this.selectedYear = this.currentDate.getFullYear();

        this.rerenderMonth();
    }

    public render() {
        domel('div', this.slot)
            .addClass(`${this.cssPrefix}-header`)
            .addChild('span', builder => this.headerTextElem = builder.toDOM());

        domel(this.slot)
            .addChildElement(this.renderCalendarButtons());

        this.calendarBody = domel('div', this.slot)
            .addClass(`${this.cssPrefix}-body`)
            .toDOM();
    }

    protected renderCalendarButtons() {
        const builder = domel('nav')
            .addClass(`${this.cssPrefix}-nav`)
            .addChild('div', builder => builder 
                .addClass(`${this.cssPrefix}-nav-prev`)
                .on('click', () => {
                    this.prev();
                })
                .addChild('span', builder => builder.html('&lsaquo;'))
            )
            .addChild('div', builder => builder
                .addClass(`${this.cssPrefix}-nav-selectors`)
                .addChild('div', builder => builder
                    .addClass(`${this.cssPrefix}-nav-month`)
                    .addChild('select', builder => {
                        builder
                        .on('change', () => {
                            this.jump(this.selectedYear, parseInt(this.selectMonthElem.value));
                        })
                        for(let i = 0; i < this.months.length; i++) {
                            builder.addChild('option', builder => builder
                                .attr('value', i.toString())
                                .text(this.months[i])
                            )
                        }
    
                        this.selectMonthElem = builder.toDOM() as HTMLSelectElement
                    })
                )
                .addChild('div', builder => builder
                    .addClass(`${this.cssPrefix}-nav-year`)
                    .addChild('select', builder => this.selectYearElem = builder
                        .on('change', () => {
                            this.jump(parseInt(this.selectYearElem.value), this.selectedMonth);
                        })
                        .toDOM() as HTMLSelectElement
                    )
                )
            )
            .addChild('div', builder => builder 
                .addClass(`${this.cssPrefix}-nav-next`)
                .on('click', () => {
                    this.next();
                })
                .addChild('span', builder => builder.html('&rsaquo;'))
            );

        return builder.toDOM();
    }

    protected prev() {
        this.selectedYear = (this.selectedMonth === 0) ? this.selectedYear - 1 : this.selectedYear;
        this.selectedMonth = (this.selectedMonth === 0) ? 11 : this.selectedMonth - 1;
        this.rerenderMonth();
    }

    protected next() { 
        this.selectedYear = (this.selectedMonth === 11) ? this.selectedYear + 1 : this.selectedYear;
        this.selectedMonth = (this.selectedMonth + 1) % 12;
        this.rerenderMonth();
    }

    protected rerenderSelectYear() {
        const match = /c-(\d*):c\+(\d*)/g.exec(this.options.yearRange);
        let minusYear = 0;
        let plusYear = 1;
        if (match !== null) {
            minusYear = parseInt(match[1]);
            plusYear = parseInt(match[2]);
        }
      
        this.selectYearElem.innerHTML = '';
        for(let i = 0; i <= minusYear + plusYear; i++) {
            let op = document.createElement("option");
            let year = this.selectedYear - minusYear + i;
            op.value = year.toString();
            op.innerText = year.toString(); 
            this.selectYearElem.appendChild(op);
        }
    }

    protected jump(year: number, month: number) {
        this.selectedYear = year;
        this.selectedMonth = month;

        this.rerenderMonth();
    }

    protected rerenderMonth() {

        //header text
        const locale = i18n.getCurrentLocale();
        this.headerTextElem.innerText = this.currentDate.toLocaleString(
            locale == 'en' ? undefined : locale,
            {  
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

        this.rerenderSelectYear();

        let firstDay = (new Date(this.selectedYear, this.selectedMonth)).getDay();
        let daysInMonth = new Date(this.selectedYear, this.selectedMonth + 1, 0).getDate();

        this.calendarBody.innerHTML = "";
    
        this.selectYearElem.value = this.selectedYear.toString();
        this.selectMonthElem.value = this.selectedMonth.toString();
    

        this.daysOfWeek.forEach((day, idx) => {
            domel('div', this.calendarBody)
                .addClass(`${this.cssPrefix}-weekday`)
                .addClass(idx == 0 || idx == 6 ? `${this.cssPrefix}-weekend` : '')
                .text(day); 
        })

        // Add empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            domel('div', this.calendarBody)
                .addClass(`${this.cssPrefix}-day-empty`);
        }

        // Add all month days
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const builder = domel('div', this.calendarBody)
                .addClass(`${this.cssPrefix}-day`)
                .attr('data-date', day.toString())
                .text(day.toString())
                .on('click', (e) => {
                    this.currentDate.setFullYear(this.selectedYear);
                    this.currentDate.setMonth(this.selectedMonth);
                    this.currentDate.setDate(parseInt((e.target as HTMLElement).getAttribute('data-date')));
    
                    this.dateChanged();
                });
    
            if (day === today.getDate() && this.selectedYear === today.getFullYear() && this.selectedMonth === today.getMonth()) {
                builder.addClass(`${this.cssPrefix}-day-current`);
            } 

            if (day === this.currentDate.getDate() && this.selectedYear === this.currentDate.getFullYear() && this.selectedMonth === this.currentDate.getMonth()) {
                builder.addClass(`${this.cssPrefix}-day-selected`);
            }

            const dayOfWeek = (firstDay + day - 1) % 7;
            if (dayOfWeek == 0 || dayOfWeek == 6) {
                builder.addClass(`${this.cssPrefix}-weekend`);
            }
        }

        // Add empty cells after last day
        const cellsDrawnInLastRow = (firstDay + daysInMonth) % 7;
        const cellsToDraw = cellsDrawnInLastRow == 0 ? 0 : 7 - cellsDrawnInLastRow;
        for (let i = 0; i < cellsToDraw; i++) {
            domel('div', this.calendarBody)
                .addClass(`${this.cssPrefix}-day-empty`);
        }
    }

    protected dateChanged() {
        super.dateChanged();
        
        this.rerenderMonth();
    }
}   