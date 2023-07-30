function LiveValidation() {
    Validation.call(this);
};

LiveValidation.prototype = Object.create(Validation.prototype);
LiveValidation.prototype.constructor = LiveValidation;

LiveValidation.prototype.validate = function (param) {
    var errors = [];
    for (var key in param) {
        switch (key) {
            case 'live_url':
                if (param.live === Const.LIVE_YES) {
                    if (!param[key].match(/^https?(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)$/)) {
                        errors.push('正しいURLを入力してください。');
                    }
                }
                break;
        }
    }

    return errors;
};