/**
 * Created by robertwright on 12/14/22.
 */

import {LightningElement,api,track} from 'lwc';
import {FlowAttributeChangeEvent} from 'lightning/flowSupport';
Date.prototype.addDays = function(days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

export default class FlowDatePicker extends LightningElement {

    @api validate() {
        if (!this.required) return {isValid: true};
        else if (this.currentSelectedRecords.length > 0) return {isValid: true};
        else {
            return {
                isValid: false,
                errorMessage: 'Selection is required!'
            };
        }
    }

    @api isExtension = false;

    /**Input Only**/
    @api maxSelection = 5;
    @api startDateTimeFieldName;
    @api selectorLabelFieldName;
    @api label = 'Select a Date and Time';
    @api required = false;

    /**Input/Output**/
    @api prefillRecords = [];
    @track records;

    /**Output Only**/
    @api selectedRecords;
    @api selectedRecordIds;
    @api selectedRecordDates;

    monthMap = {
        0: 'January',
        1: 'February',
        2: 'March',
        3: 'April',
        4: 'May',
        5: 'June',
        6: 'July',
        7: 'August',
        8: 'September',
        9: 'October',
        10: 'November',
        11: 'December'
    }
    weekDayMap = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday'
    }
    calendarRows = [
        [{}, {}, {}, {}, {}, {}, {}],
        [{}, {}, {}, {}, {}, {}, {}],
        [{}, {}, {}, {}, {}, {}, {}],
        [{}, {}, {}, {}, {}, {}, {}],
        [{}, {}, {}, {}, {}, {}, {}]
    ];

    @track currentMonth;
    @track currentYear;
    @track currentSelectedDate;
    @track recordMap = new Map();
    @track currentVisibleRecords;

    connectedCallback() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();

        this.records = (this.prefillRecords || []).map(record => {
            return {_selectorLabel: record[this.selectorLabelFieldName], ...record};
        });

        this.resetRecordMap();
        this.resetCalendarRows();
    }

    get currentSelectedRecords() {
        return (this.records || []).filter(record => record._selected === true);
    };

    get currentSelectedRecordDates() {
        const dateSet = new Set((this.records || [])
            .filter(record => record._selected === true)
            .map(record => record._date));
        return [...dateSet];
    };

    get disabledPreviousMonth() {
        const minDate = new Date((this.records || [])[0][this.startDateTimeFieldName]).setHours(0, 0, 0, 0);
        const thisMonth = new Date(this.currentYear, this.currentMonth, 1).setHours(0, 0, 0, 0);
        return minDate >= thisMonth;
    }

    get disabledNextMonth() {
        const endIndex = (this.records || []).length - 1;
        const nextMonth = ((this.currentMonth + 1) > 11) ? 0 : this.currentMonth + 1;
        const currentYear = ((this.currentMonth + 1) > 11) ? this.currentYear + 1 : this.currentYear;
        const endOfMonth = new Date(currentYear, nextMonth, 0).setHours(0, 0, 0, 0);

        const maxDate = new Date((this.records || [])[endIndex][this.startDateTimeFieldName]);
        const maxDateMonth = ((maxDate.getMonth() + 1) > 11) ? 0 : maxDate.getMonth() + 1;
        const maxDateYear = ((maxDate.getMonth() + 1) > 11) ? maxDate.getFullYear() + 1 : maxDate.getFullYear();

        const relativeMax = new Date(maxDateYear, maxDateMonth, 0).setHours(0, 0, 0, 0);

        return relativeMax <= endOfMonth;
    }

    get currentMonthValue() {
        return this.monthMap[this.currentMonth];
    }

    get currentSelectedDateValue() {
        if (!this.currentSelectedDate) return ''
        const tempDate = new Date(this.currentSelectedDate).setHours(0, 0, 0, 0);
        const currentDate = new Date(tempDate);
        const currentMonth = this.monthMap[currentDate.getMonth()];
        const currentDay = this.weekDayMap[currentDate.getDay()];
        const currentDateValue = currentDate.getDate();
        return `${currentDay}, ${currentMonth} ${currentDateValue}`;
    }

    resetCalendarRows() {
        const currentSelectedDate = (this.currentSelectedDate) ? this.currentSelectedDate.setHours(0, 0, 0, 0) : new Date().setHours(0, 0, 0, 0);

        const nextMonth = ((this.currentMonth + 1) > 11) ? 0 : this.currentMonth + 1;
        const currentYear = ((this.currentMonth + 1) > 11) ? this.currentYear + 1 : this.currentYear;
        const lastDateOfMonth = new Date(currentYear, nextMonth, 0);
        const selectionsDatesSet = new Set(this.currentSelectedRecordDates);

        const calendarRows = [
            {calenderColumns: [{}, {}, {}, {}, {}, {}, {}], key: 1},
            {calenderColumns: [{}, {}, {}, {}, {}, {}, {}], key: 2},
            {calenderColumns: [{}, {}, {}, {}, {}, {}, {}], key: 3},
            {calenderColumns: [{}, {}, {}, {}, {}, {}, {}], key: 4},
            {calenderColumns: [{}, {}, {}, {}, {}, {}, {}], key: 5}
        ];

        let day = 1;
        let week = 0;
        let currentDate = new Date(this.currentYear, this.currentMonth, 1);
        let dayOfWeek = currentDate.getDay();

        while (week < 5) {
            while (dayOfWeek < 7 && currentDate <= lastDateOfMonth) {
                const rowColumn = calendarRows[week].calenderColumns[dayOfWeek];
                rowColumn.day = day;
                rowColumn.date = currentDate.setHours(0, 0, 0, 0);
                if (this.recordMap.has(currentDate.setHours(0, 0, 0, 0))) {
                    rowColumn.tabIndex = 0;
                    rowColumn.class = ((currentSelectedDate && currentSelectedDate === rowColumn.date) || selectionsDatesSet.has(rowColumn.date)) ? 'slds-is-selected' : 'is-selectable';
                } else rowColumn.disabled = true;
                currentDate = currentDate.addDays(1);
                day++;
                dayOfWeek++;
            }
            dayOfWeek = 0;
            week++;
        }

        this.calendarRows = calendarRows;
    }

    resetRecordMap() {
        this.recordMap = new Map();
        for (const record of this.records || []) {
            const startDateValue = (record && this.startDateTimeFieldName) ? record[this.startDateTimeFieldName] : '' || '';
            if (startDateValue) {
                const startDate = new Date(startDateValue).setHours(0, 0, 0, 0);
                if (!this.recordMap.has(startDate)) this.recordMap.set(startDate, []);
                const recordMapArray = this.recordMap.get(startDate);
                record._date = startDate
                recordMapArray.push(record);
            }
        }
    }

    resetCurrentVisibleRecords() {
        const tempDate = new Date(this.currentSelectedDate).setHours(0, 0, 0, 0);
        const disableNonSelected = (this.currentSelectedRecords || []).length >= (this.maxSelection || 1);
        this.currentVisibleRecords = (this.recordMap.get(tempDate) || []).map(record => {
            if (disableNonSelected && !record._selected) {
                record._disabled = true;
            } else if (record._disabled) delete record._disabled;
            return record;
        });
    }

    handleNextMonth(event) {
        if (this.currentMonth === 11) {
            this.currentMonth = 0;
            this.currentYear = this.currentYear + 1;
        } else this.currentMonth++;
        this.resetCalendarRows();
    }

    handlePreviousMonth(event) {
        if (this.currentMonth === 0) {
            this.currentMonth = 11;
            this.currentYear = this.currentYear - 1;
        } else this.currentMonth--;
        this.resetCalendarRows();
    }

    handleSelectDate(event) {
        if (event.currentTarget.dataset.disabled === "true") {
            return;
        }
        const currentDate = event.currentTarget.dataset.dateValue;
        this.currentSelectedDate = new Date(Number(currentDate));
        this.resetCurrentVisibleRecords();
        this.resetCalendarRows();
    }

    handleSelectTime(event) {
        if (event.currentTarget.disabled) return;
        const dateValue = event.currentTarget.dataset.dateValue;
        if (!dateValue) return;

        const recordId = event.currentTarget.value;
        const relatedRecord = this.records.find(record => record.Id === recordId);

        if (relatedRecord._selected) delete relatedRecord._selected;
        else relatedRecord._selected = true;

        this.resetCurrentVisibleRecords();
        this.dispatchOutputEvents();
    }

    dispatchOutputEvents() {
        const selectedRecords = this.records.filter(record => record._selected === true);
        const selectedRecordIds = new Set((selectedRecords || []).map(record => record.Id));
        const selectedRecordDates = new Set((selectedRecords || []).map(record => record[[this.startDateTimeFieldName]]));

        const selectedRecordsChangeEvent = (this.isExtension) ? new CustomEvent('selectedrecordschange', {detail: selectedRecords}) : new FlowAttributeChangeEvent('selectedRecords', selectedRecords);
        this.dispatchEvent(selectedRecordsChangeEvent);

        const selectedRecordIdsChangeEvent = (this.isExtension) ? new CustomEvent('selectedrecordidschange', {detail: [...selectedRecordIds]}) : new FlowAttributeChangeEvent('selectedRecordIds', [...selectedRecordIds]);
        this.dispatchEvent(selectedRecordIdsChangeEvent);

        const selectedRecordDatesChangeEvent = (this.isExtension) ? new CustomEvent('selectedrecorddateschange', {detail: [...selectedRecordDates]}) : new FlowAttributeChangeEvent('selectedRecordDates', [...selectedRecordDates]);
        this.dispatchEvent(selectedRecordDatesChangeEvent);
    }
}