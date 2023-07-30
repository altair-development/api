function HomeController(svcLoc) {
    Controller.call(this);
    this.super = Controller.prototype;
    this.svcLoc = svcLoc;
};

HomeController.prototype = Object.create(Controller.prototype);
HomeController.prototype.constructor = HomeController;

HomeController.prototype.initialize = function () {
    $('[id^="tabs"]').hide();
    $('.tabArea').hide();
};

HomeController.prototype.indexAction = function () {
    $('#home').show();
};