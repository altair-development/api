function FightTicketValidation() {
    Validation.call(this);
};

FightTicketValidation.prototype = Object.create(Validation.prototype);
FightTicketValidation.prototype.constructor = FightTicketValidation;

FightTicketValidation.prototype.validate = function (param) {
    var errors = [];
    for (var key in param) {
        switch (key) {
            case 'winner':
                if (param.draw === Const.DRAW_NO && !param[key]) {
                    errors.push('勝者を選択してください。');
                }

                break;
        }
    }

    return errors;
};