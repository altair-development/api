function TicketValidation() {
    Validation.call(this);
};

TicketValidation.prototype = Object.create(Validation.prototype);
TicketValidation.prototype.constructor = TicketValidation;

TicketValidation.prototype.validate = function (param) {
    var errors = [];
    for (var key in param) {
        switch (key) {
            case 'description':
                if (param.description.length > 0) {
                    if (!this.lengthBetween(param[key], 0, 9999)) {
                        errors.push('文字数上限をオーバーしました。入力可能な文字数はHTMLタグを含め9999文字です。');
                    }
                }

                break;
            case 'start_date':
                if (param.start_date.length > 0) {
                    if (!this.checkDateFormat(param[key])) {
                        errors.push('開始日は年4桁-月2桁-日2桁で入力してください。例：2019-04-01');
                    }
                }

                break;
            case 'end_date':
                if (param.end_date.length > 0) {
                    if (!this.checkDateFormat(param[key])) {
                        errors.push('終了日は年4桁-月2桁-日2桁で入力してください。例：2019-04-01');
                    }
                    if (param.start_date.length > 0) {
                        if (!(param.start_date <= param[key])) {
                            errors.push('終了日は開始日以降を選択してください。');
                        }
                    }
                }

                break;
        }
    }

    return errors;
};