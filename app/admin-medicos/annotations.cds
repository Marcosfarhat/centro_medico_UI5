using AdminService as service from '../../srv/admin-service';
annotate service.Medicos with {
    especialidad @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Especialidades',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : especialidad_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'nombre',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'descripcion',
            },
        ],
    }
};

