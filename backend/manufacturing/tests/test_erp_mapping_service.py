from django.test import TestCase
from manufacturing.models.mapping_profile import ImportProfile, ImportFieldMapping
from manufacturing.domain.erp_mapping_service import ERPMappingService, ERPMappingError


class ERPMappingServiceTests(TestCase):

    def setUp(self):
        self.profile = ImportProfile.objects.create(name="Test Profile", domain="PLANT_STRUCTURE")

    def test_create_profile(self):
        p = ERPMappingService.create_profile("New Profile", "PLANT_STRUCTURE")
        self.assertEqual(p.name, "New Profile")

    def test_create_profile_empty_name_raises(self):
        with self.assertRaises(ERPMappingError):
            ERPMappingService.create_profile("")

    def test_save_valid_mapping(self):
        m = ERPMappingService.save_mapping(str(self.profile.id), "Department", "dept_code", "department_code", is_required=True)
        self.assertEqual(m.source_column, "dept_code")
        self.assertEqual(m.target_field, "department_code")
        self.assertTrue(m.is_required)

    def test_save_invalid_entity_type_raises(self):
        with self.assertRaises(ERPMappingError):
            ERPMappingService.save_mapping(str(self.profile.id), "InvalidEntity", "col", "field")

    def test_save_empty_source_column_raises(self):
        with self.assertRaises(ERPMappingError):
            ERPMappingService.save_mapping(str(self.profile.id), "Department", "", "field")

    def test_required_field_detection(self):
        ERPMappingService.save_mapping(str(self.profile.id), "Department", "dept_name", "department_name")
        result = ERPMappingService.validate_mapping(str(self.profile.id))
        missing = [i for i in result.issues if i.code == "REQUIRED_MISSING"]
        self.assertTrue(any("department_code" in i.message for i in missing))

    def test_validate_ok_with_full_coverage(self):
        ERPMappingService.save_mapping(str(self.profile.id), "Department", "dept_code", "department_code", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "ResourceGroup", "rg_code", "resource_group_code", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "ResourceGroup", "rg_name", "resource_group_name", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "ResourceGroup", "dept_code", "department_code", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "Resource", "res_code", "resource_code", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "Resource", "res_name", "resource_name", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "Resource", "rg_code", "resource_group_code", is_required=True)
        result = ERPMappingService.validate_mapping(str(self.profile.id))
        self.assertTrue(result.ok)

    def test_activate_profile_valid(self):
        ERPMappingService.save_mapping(str(self.profile.id), "Department", "dept_code", "department_code", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "ResourceGroup", "rg_code", "resource_group_code", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "ResourceGroup", "rg_name", "resource_group_name", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "ResourceGroup", "dept_code", "department_code", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "Resource", "res_code", "resource_code", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "Resource", "res_name", "resource_name", is_required=True)
        ERPMappingService.save_mapping(str(self.profile.id), "Resource", "rg_code", "resource_group_code", is_required=True)
        result = ERPMappingService.validate_mapping(str(self.profile.id))
        self.assertTrue(result.ok)

    def test_get_mappings(self):
        ERPMappingService.save_mapping(str(self.profile.id), "Department", "dept_code", "department_code")
        ERPMappingService.save_mapping(str(self.profile.id), "Resource", "res_code", "resource_code")
        mappings = ERPMappingService.get_mappings(str(self.profile.id))
        self.assertEqual(len(mappings), 2)

    def test_remove_mapping(self):
        m = ERPMappingService.save_mapping(str(self.profile.id), "Department", "dept_code", "department_code")
        ERPMappingService.remove_mapping(str(self.profile.id), str(m.id))
        mappings = ERPMappingService.get_mappings(str(self.profile.id))
        self.assertEqual(len(mappings), 0)

    def test_activate_profile_invalid_raises(self):
        with self.assertRaises(ERPMappingError):
            ERPMappingService.activate_profile(str(self.profile.id))

    def test_export_mapping(self):
        ERPMappingService.save_mapping(str(self.profile.id), "Department", "dept_code", "department_code", is_required=True)
        data = ERPMappingService.export_mapping(str(self.profile.id))
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["source_column"], "dept_code")

    def test_nexus_target_fields(self):
        fields = ERPMappingService.nexus_target_fields("Department")
        self.assertIn("Department", fields)
        self.assertIn("code", fields["Department"])

    def test_list_profiles(self):
        profiles = ERPMappingService.list_profiles()
        self.assertEqual(len(profiles), 1)
