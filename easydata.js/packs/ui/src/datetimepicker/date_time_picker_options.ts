export interface DateTimePickerOptions {
    yearRange?: string;
    showTimePicker?: boolean;
    showCalendar?: boolean;
    oneClickDateSelection?: boolean;
    beforeShow?: () => void;
    onApply?: (dateTime: Date) => void;
    onCancel?: () => void;
    onDateTimeChanged?: (date: Date) => void;
} 
