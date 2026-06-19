-- Migration 051: Eliminar la sobrecarga de 4 parámetros de sp_save_document
-- creada en migration 028. La versión correcta es la de 5 parámetros (migration 003)
-- que incluye p_step_id y actualiza wizard_steps.status = 'completed'.
-- Sin este DROP, PostgreSQL podía resolver el RPC call al overload incorrecto
-- cuando se omitía p_step_id, dejando wizard_steps sin actualizar.
DROP FUNCTION IF EXISTS sp_save_document(TEXT, TEXT, UUID, TEXT);
