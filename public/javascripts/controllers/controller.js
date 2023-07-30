function Controller() {
};

Controller.prototype.initialize = function () {
    $('[id^="tabs"]').hide();
    $('.tabArea').hide();
    this.editTabsHash();
    this.clearTab();
    $('#' + this.tabName1 + ' a[tab_id="' + this.action + '"]').addClass('tabActive');
    $('#' + this.tabName1).show();
};

Controller.prototype.clearTab = function () {
    $('[id^="tabs"]').find('.tabActive').removeClass('tabActive');
};
