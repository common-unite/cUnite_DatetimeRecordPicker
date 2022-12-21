/**
 * Created by robertwright on 12/14/22.
 */

import {LightningElement,api} from 'lwc';
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

    @api startDateTimeFieldName /**Must be datetime field**/;
    @api selectorLabelFieldName /**Must be a text, richtext or textarea field**/;
    @api disabledFieldName; /**Must be a boolean field**/
    @api themeFieldName; /**Must be a String field**/

    @api label = 'Select a Date and Time';
    @api required = false;
    @api hideCalendarOnSelection = false;

    @api get selectedStartDate() {
        return this.currentSelectedDate;
    } set selectedStartDate(value) {
        const date = (value) ? new Date(value) : null;
        if(date) this.currentSelectedDate = new Date(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
        else this.currentSelectedDate = null;
    }

    /**Input/Output**/
    @api get prefillRecords() {
        return this.records;
    }
    set prefillRecords(value) {
        if(this.isConnected) this.resetComponent(value);
        else this.records = value || [];
    }
    records;

    /**Output Only**/
    resetSelectedRecords() {
        const value = this.selectedRecords || [];

        const selectedRecordIds = new Set();
        const size = ((this.maxSelection || 1) <= (value || []).length) ? this.maxSelection || 1 : (value || []).length;
        for(let itr = 0; itr < size; itr++) {
            selectedRecordIds.add(value[itr].Id);
        }

        (this.records || [])
            .filter(record => record.Id && (selectedRecordIds.has(record.Id) || record._selected === true))
            .forEach(record => {
                const disabled = (record[this.disabledFieldName]) ? record[this.disabledFieldName] : false;
                if(selectedRecordIds.has(record.Id) && !disabled) record._selected = true;
                else if(record._selected) delete record._selected;
            });

        this.resetCurrentVisibleRecords();
    }
    @api get selectedRecords() {
        return this._selectedRecords;
    };
    set selectedRecords(value) {
        this._selectedRecords = value || [];
        if(this.isConnected) {
            this.resetSelectedRecords();
        }
    }
    _selectedRecords;

    @api selectedRecordIds;
    @api selectedRecordDates;
    @api firstSelectedRecord;

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

    currentMonth;
    currentYear;
    currentSelectedDate;
    recordMap = new Map();
    currentVisibleRecords;
    _hideCalender = false;

    get showReturnArrow() {
        return this._hideCalender;
    }

    connected = false;
    resetComponent(records) {
        const firstRecord = ((records || []).length > 0) ? records[0] : null;
        const firstDate = (firstRecord) ? new Date(firstRecord[this.startDateTimeFieldName]) : new Date();

        const calendarStartDate = (firstDate > this.selectedStartDate) ? firstDate : this.selectedStartDate;

        this.currentYear = calendarStartDate.getFullYear();
        this.currentMonth = calendarStartDate.getMonth();

        this.records = (records || [])
            .filter(record => record[this.startDateTimeFieldName] && record[this.selectorLabelFieldName])
            .map(record => {
                return {_selectorLabel: record[this.selectorLabelFieldName], ...record};
            });

        this.resetRecordMap();
        this.resetSelectedRecords();
        this.resetCalendarRows();
        this.resetCurrentVisibleRecords();
    }
    connectedCallback() {
        this.connected = true;
        this.resetComponent(this.prefillRecords);
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
            {calenderColumns: [{disabled:true}, {disabled:true}, {disabled:true}, {disabled:true}, {disabled:true}, {disabled:true}, {disabled:true}], key: 1},
            {calenderColumns: [{}, {}, {}, {}, {}, {}, {}], key: 2},
            {calenderColumns: [{}, {}, {}, {}, {}, {}, {}], key: 3},
            {calenderColumns: [{}, {}, {}, {}, {}, {}, {}], key: 4},
            {calenderColumns: [{disabled:true}, {disabled:true}, {disabled:true}, {disabled:true}, {disabled:true}, {disabled:true}, {disabled:true}], key: 5}
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
                    if(rowColumn.disabled) delete rowColumn.disabled;
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
        if(!this.currentSelectedDate) return;
        if(this.hideCalendarOnSelection) this._hideCalender = true;

        const tempDate = new Date(this.currentSelectedDate).setHours(0, 0, 0, 0);
        const disableNonSelected = this.maxSelection > 1 && (this.currentSelectedRecords || []).length >= (this.maxSelection || 1);
        this.currentVisibleRecords = (this.recordMap.get(tempDate) || []).map(record => {

            record._class = `slds-visual-picker__figure slds-visual-picker__text slds-align_absolute-center ${record[this.themeFieldName]}`;

            const recordIsDisabled = record[this.disabledFieldName] || false;
            if (recordIsDisabled || (disableNonSelected && !record._selected)) {
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
        if (event.currentTarget.dataset.disabled === 'true') {
            return;
        }
        const currentDate = event.currentTarget.dataset.dateValue;
        this.currentSelectedDate = new Date(Number(currentDate));
        this.resetCurrentVisibleRecords();
        this.resetCalendarRows();
        if(this.hideCalendarOnSelection) this._hideCalender = true;
    }

    handleSelectTime(event) {
        if (event.currentTarget.disabled) return;
        const dateValue = event.currentTarget.dataset.dateValue;
        if (!dateValue) return;

        const recordId = event.currentTarget.value;
        const relatedRecord = this.records.find(record => record.Id === recordId);

        if((this.firstSelectedRecord || {}).Id === relatedRecord.Id && this.required && this.maxSelection === 1) return;

        if (relatedRecord._selected) delete relatedRecord._selected;
        else relatedRecord._selected = true;

        if(relatedRecord._selected === true && this.maxSelection === 1) {
            this.records.filter(record => record.Id !== relatedRecord.Id && record._selected === true)
                .forEach(record => delete record._selected);
        }

        this.dispatchOutputEvents();
    }

    dispatchOutputEvents() {
        const selectedRecords = this.records.filter(record => record._selected === true);
        const selectedRecordIds = new Set((selectedRecords || []).map(record => record.Id));
        const selectedRecordDates = new Set((selectedRecords || []).map(record => record[[this.startDateTimeFieldName]]));
        const firstSelectedRecord = ((selectedRecords || []).length > 0) ? selectedRecords[0] : null;

        const firstSelectedRecordChangeEvent = (this.isExtension) ? new CustomEvent('firstselectedrecordchange', {detail: firstSelectedRecord}) : new FlowAttributeChangeEvent('firstSelectedRecord', firstSelectedRecord);
        this.dispatchEvent(firstSelectedRecordChangeEvent);

        const selectedRecordsChangeEvent = (this.isExtension) ? new CustomEvent('selectedrecordschange', {detail: selectedRecords}) : new FlowAttributeChangeEvent('selectedRecords', selectedRecords);
        this.dispatchEvent(selectedRecordsChangeEvent);

        const selectedRecordIdsChangeEvent = (this.isExtension) ? new CustomEvent('selectedrecordidschange', {detail: [...selectedRecordIds]}) : new FlowAttributeChangeEvent('selectedRecordIds', [...selectedRecordIds]);
        this.dispatchEvent(selectedRecordIdsChangeEvent);

        const selectedRecordDatesChangeEvent = (this.isExtension) ? new CustomEvent('selectedrecorddateschange', {detail: [...selectedRecordDates]}) : new FlowAttributeChangeEvent('selectedRecordDates', [...selectedRecordDates]);
        this.dispatchEvent(selectedRecordDatesChangeEvent);
    }

    handleCloseTimeSelector(event) {
        this._hideCalender = false;
        this.currentVisibleRecords = null;
    }
}