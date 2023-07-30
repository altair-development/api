function ProjectValidation() {
    Validation.call(this);
};

ProjectValidation.prototype = Object.create(Validation.prototype);
ProjectValidation.prototype.constructor = ProjectValidation;

ProjectValidation.prototype.validate = function (param) {
    var errors = [];
    for (var key in param) {
        switch (key) {
            case 'name':
                if (!this.lengthBetween(param[key], 1, 255)) {
                    errors.push('タイトルは1文字以上255文字以下で入力してください。');
                }
                if (!this.checkNotCntrChar(param[key])) {
                    errors.push('タイトルは制御文字以外で入力してください。');
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