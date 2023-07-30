function Validation() { };

Validation.prototype.lengthBetween = function (str, from, to) {
    return from <= str.length && str.length <= to;
};

Validation.prototype.checkDateFormat = function (date) {
    return date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
};

Validation.prototype.checkNotCntrChar = function (val) {
    return val.match(/^[^\x00-\x1F\x7F-\x9F]+$/);
};