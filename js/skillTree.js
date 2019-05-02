var SkillTree = angular.module('skillTree', []);

SkillTree.controller('skillTreeController', ['$scope', '$http', '$window', function($scope, $http, $window) {
    //Load Meta Data
    $http.get($window.folderName + '/Meta.json')
    .then(function(meta){
        $scope.initalSP = meta.data.initialSP;
        $scope.totalSkillPoints = parseInt(meta.data.initialSP) + 1;
        $scope.usedSkillPoints = 0;
        $scope.retirementData = meta.data.retirementData;
        $scope.initialClass = meta.data.initialClass;

        //initialize level selector
        $scope.level = {
            "selected": 1,
            "levels": []
        }
        for(var i = 1; i <= meta.data.maxLevel; i++) {
            $scope.level.levels.push(i);
        };

        //initialize retirement selector
        $scope.retirement = {
            "selected": meta.data.initialRetirementData,
            "retirements": []
        }
        for(var keyName in $scope.retirementData) {
            var key = keyName;
            $scope.retirement.retirements.push(key);
        }
    });

    //Load Skill Data
    $http.get($window.folderName + '/Skills.json')
        .then(function(skills){
            $scope.skillData = skills.data;
            $scope.class = {
                "selected": $scope.initialClass,
                "classes": []
            };
            for(var keyName in $scope.skillData) {        
                var key = keyName;
                $scope.class.classes.push(key);
            };
        });

    //Update skill points with selected level or retirement is changed
    $scope.updateSP = function() {
        var retiredSp = $scope.retirementData[$scope.retirement.selected];
        retiredSp = undefined ? '0' : retiredSp;
        $scope.totalSkillPoints = parseInt($scope.initalSP) + parseInt($scope.level.selected) + parseInt(retiredSp);
    };
    
}]);
